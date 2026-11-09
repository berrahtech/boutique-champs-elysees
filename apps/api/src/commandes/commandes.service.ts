import { HttpStatus, Injectable } from '@nestjs/common';
import type {
  ActionCommande,
  AdresseLivraison,
  CommandeAdmin,
  CommandeAdminDetail,
  CommandeClient,
  CommandeResume,
  CreationCommande,
  EcritureActionCommande,
  ListeCommandesAdmin,
  PreremplissageCommande,
  ResumeVentes,
  StatutCommande,
} from '@lce/contrats';
import { createHash, randomInt } from 'node:crypto';
import { Probleme } from '../commun/erreurs/probleme';
import { PrismaService } from '../commun/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { JetonAcces } from '../identite/jetons.service';
import { PanierService } from '../panier/panier.controller';

const PAR_PAGE = 20;

const INCLUSIONS_DETAIL = {
  zone: { select: { nom: true, delaiHeures: true } },
  lignes: { include: { produit: { select: { slug: true, imageProduits: { orderBy: { ordre: 'asc' }, take: 1, select: { url200: true } } } } } },
  historique: { orderBy: { date: 'asc' }, include: { acteur: { select: { nom: true } } } },
} satisfies Prisma.CommandeInclude;
type CommandeLue = Prisma.CommandeGetPayload<{ include: typeof INCLUSIONS_DETAIL }>;

const INCLUSIONS_LISTE = {
  client: { select: { id: true, nom: true, telephone: true } },
  zone: { select: { nom: true } },
  lignes: { select: { quantite: true } },
  missions: {
    where: { statut: { in: ['PROPOSEE', 'ACCEPTEE', 'EN_COURS', 'LIVREE'] } },
    include: { livreur: { include: { utilisateur: { select: { nom: true } } } } },
  },
} satisfies Prisma.CommandeInclude;
type CommandeListee = Prisma.CommandeGetPayload<{ include: typeof INCLUSIONS_LISTE }>;

/** Missions qui occupent la commande : une seule à la fois (index ux_mission_active). */
const MISSIONS_ACTIVES = ['PROPOSEE', 'ACCEPTEE', 'EN_COURS'] as const;

/** Statuts où la commande attend une action de l'équipe. */
export const STATUTS_A_TRAITER: StatutCommande[] = ['CONFIRMEE', 'EN_PREPARATION', 'EN_ATTENTE_AFFECTATION', 'ECHEC_LIVRAISON'];

interface Transition {
  de: StatutCommande[];
  vers: StatutCommande;
  permission: string;
}

/** Le parcours d'une commande. Toute autre transition est refusée. */
const TRANSITIONS: Record<ActionCommande, Transition> = {
  preparer: { de: ['CONFIRMEE'], vers: 'EN_PREPARATION', permission: 'commande.changer_statut' },
  prete: { de: ['EN_PREPARATION'], vers: 'EN_ATTENTE_AFFECTATION', permission: 'commande.changer_statut' },
  affecter: { de: ['EN_ATTENTE_AFFECTATION', 'AFFECTEE'], vers: 'AFFECTEE', permission: 'commande.affecter' },
  expedier: { de: ['AFFECTEE'], vers: 'EN_COURS_LIVRAISON', permission: 'commande.changer_statut' },
  livrer: { de: ['EN_COURS_LIVRAISON'], vers: 'LIVREE', permission: 'commande.changer_statut' },
  echec: { de: ['EN_COURS_LIVRAISON'], vers: 'ECHEC_LIVRAISON', permission: 'commande.changer_statut' },
  relivrer: { de: ['ECHEC_LIVRAISON'], vers: 'EN_ATTENTE_AFFECTATION', permission: 'commande.affecter' },
  retour: { de: ['ECHEC_LIVRAISON'], vers: 'RETOUR_ENTREPOT', permission: 'commande.changer_statut' },
  annuler: {
    de: ['EN_ATTENTE_PAIEMENT', 'CONFIRMEE', 'EN_PREPARATION', 'EN_ATTENTE_AFFECTATION', 'AFFECTEE'],
    vers: 'ANNULEE',
    permission: 'commande.annuler',
  },
};

export function actionsPossibles(statut: StatutCommande, permissions: readonly string[]): ActionCommande[] {
  return (Object.keys(TRANSITIONS) as ActionCommande[]).filter(
    (a) => TRANSITIONS[a].de.includes(statut) && permissions.includes(TRANSITIONS[a].permission),
  );
}

const introuvable = () => new Probleme('commande-introuvable', HttpStatus.NOT_FOUND, 'Commande introuvable');

function versAdresse(json: Prisma.JsonValue): AdresseLivraison {
  const a = (json ?? {}) as Record<string, string>;
  return { nom: a['nom'] ?? '', telephone: a['telephone'] ?? '', quartier: a['quartier'] ?? '', repere: a['repere'] ?? '' };
}

function versClient(c: CommandeLue): CommandeClient {
  return {
    id: c.id,
    numero: c.numero,
    statut: c.statut,
    moyen: c.moyen,
    total: c.total,
    nbArticles: c.lignes.reduce((n, l) => n + l.quantite, 0),
    creeLe: c.creeLe.toISOString(),
    lignes: c.lignes.map((l) => ({
      produitId: l.produitId,
      slug: l.produit.slug,
      libelle: l.libelle,
      quantite: l.quantite,
      prixUnitaire: l.prixUnitaire,
      image: l.produit.imageProduits[0]?.url200 ?? null,
    })),
    sousTotal: c.sousTotal,
    fraisLivraison: c.fraisLivraison,
    remise: c.remise,
    zone: c.zone.nom,
    delaiHeures: c.zone.delaiHeures,
    adresse: versAdresse(c.adresse),
    noteClient: c.noteClient,
    historique: c.historique.map((h) => ({ statut: h.a, date: h.date.toISOString(), motif: h.motif })),
  };
}

function versListe(c: CommandeListee): CommandeAdmin {
  return {
    id: c.id,
    numero: c.numero,
    statut: c.statut,
    moyen: c.moyen,
    total: c.total,
    nbArticles: c.lignes.reduce((n, l) => n + l.quantite, 0),
    creeLe: c.creeLe.toISOString(),
    client: c.client,
    zone: c.zone.nom,
    livreur: c.missions[0]?.livreur.utilisateur.nom ?? null,
  };
}

/**
 * Commandes : création par le client (paiement à la livraison), puis parcours
 * préparation → affectation → livraison piloté par l'équipe. Le stock suit :
 * réservé à la commande, sorti à la livraison, rendu à l'annulation ou au retour.
 */
@Injectable()
export class CommandesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly panier: PanierService,
  ) {}

  // ——— Côté client ———

  async creer(clientId: string, e: CreationCommande): Promise<CommandeClient> {
    if (e.moyen !== 'A_LA_LIVRAISON') {
      throw new Probleme('moyen-indisponible', HttpStatus.BAD_REQUEST, 'Ce moyen de paiement arrive bientôt', 'Choisissez le paiement à la livraison.');
    }
    const zone = await this.prisma.zone.findFirst({ where: { id: e.zoneId, actif: true } });
    if (!zone) throw new Probleme('zone-invalide', HttpStatus.BAD_REQUEST, 'Cette zone de livraison n’est pas desservie');

    const apercu = await this.panier.apercu({ lignes: e.lignes, zoneId: zone.id, codePromo: e.codePromo });
    if (!apercu.lignes.length) throw new Probleme('panier-vide', HttpStatus.BAD_REQUEST, 'Votre panier est vide');
    if (apercu.ajustements.length) {
      throw new Probleme('panier-modifie', HttpStatus.CONFLICT, 'Votre panier a changé', apercu.ajustements.join(' '), {
        ajustements: apercu.ajustements,
      });
    }
    if (apercu.codeRefuse) throw new Probleme('code-refuse', HttpStatus.CONFLICT, apercu.codeRefuse);

    const adresse = {
      nom: e.adresse.nom.trim(),
      telephone: e.adresse.telephone,
      quartier: e.adresse.quartier.trim(),
      repere: e.adresse.repere.trim(),
    };

    const numero = await this.prisma.$transaction(async (tx) => {
      // Le stock est réservé ligne par ligne ; si un article vient de partir, rien n'est enregistré.
      for (const l of apercu.lignes) {
        const { count } = await tx.stock.updateMany({
          where: { produitId: l.produit.id, disponible: { gte: l.quantite } },
          data: { disponible: { decrement: l.quantite }, reserve: { increment: l.quantite }, version: { increment: 1 } },
        });
        if (!count) {
          throw new Probleme('stock-insuffisant', HttpStatus.CONFLICT, `${l.produit.nom} vient d’être vendu`, 'Votre panier a été mis à jour.');
        }
      }

      let codePromoId: string | null = null;
      if (apercu.codeApplique) {
        const code = await tx.codePromo.findUnique({ where: { code: apercu.codeApplique.code } });
        const { count } = code
          ? await tx.codePromo.updateMany({
              where: { id: code.id, OR: [{ utilisationsMax: null }, { utilisations: { lt: code.utilisationsMax ?? 0 } }] },
              data: { utilisations: { increment: 1 } },
            })
          : { count: 0 };
        if (!count || !code) throw new Probleme('code-refuse', HttpStatus.CONFLICT, `Le code « ${apercu.codeApplique.code} » n’est plus disponible`);
        codePromoId = code.id;
      }

      const commande = await tx.commande.create({
        data: {
          clientId,
          zoneId: zone.id,
          codePromoId,
          statut: 'CONFIRMEE',
          moyen: e.moyen,
          sousTotal: apercu.sousTotal,
          fraisLivraison: apercu.frais,
          remise: apercu.remise,
          total: apercu.total,
          adresse,
          noteClient: e.note?.trim() || null,
          lignes: {
            create: apercu.lignes.map((l) => ({ produitId: l.produit.id, libelle: l.produit.nom, quantite: l.quantite, prixUnitaire: l.produit.prix })),
          },
        },
      });
      await tx.historiqueStatut.create({ data: { commandeId: commande.id, a: 'CONFIRMEE', acteurId: clientId } });
      await tx.mouvementStock.createMany({
        data: apercu.lignes.map((l) => ({
          produitId: l.produit.id,
          commandeId: commande.id,
          type: 'RESERVATION' as const,
          quantite: l.quantite,
          motif: `Commande ${commande.numero}`,
          acteurId: clientId,
        })),
      });
      // Le panier enregistré sur le compte est vidé : la commande le remplace.
      await tx.panier.updateMany({ where: { utilisateurId: clientId }, data: { codePromo: null } });
      await tx.lignePanier.deleteMany({ where: { panier: { utilisateurId: clientId } } });
      return commande.numero;
    });
    return this.lireClient(clientId, numero);
  }

  async listerClient(clientId: string): Promise<CommandeResume[]> {
    const commandes = await this.prisma.commande.findMany({
      where: { clientId },
      orderBy: { creeLe: 'desc' },
      take: 100,
      include: { lignes: { select: { quantite: true } } },
    });
    return commandes.map((c) => ({
      id: c.id,
      numero: c.numero,
      statut: c.statut,
      moyen: c.moyen,
      total: c.total,
      nbArticles: c.lignes.reduce((n, l) => n + l.quantite, 0),
      creeLe: c.creeLe.toISOString(),
    }));
  }

  async lireClient(clientId: string, numero: string): Promise<CommandeClient> {
    const c = await this.prisma.commande.findFirst({ where: { clientId, numero }, include: INCLUSIONS_DETAIL });
    if (!c) throw introuvable();
    return versClient(c);
  }

  /** Le client peut annuler tant que la commande n'est pas partie en préparation. */
  async annulerParClient(clientId: string, numero: string): Promise<CommandeClient> {
    const c = await this.prisma.commande.findFirst({ where: { clientId, numero } });
    if (!c) throw introuvable();
    if (c.statut !== 'CONFIRMEE' && c.statut !== 'EN_ATTENTE_PAIEMENT') {
      throw new Probleme('annulation-impossible', HttpStatus.CONFLICT, 'Cette commande est déjà en préparation', 'Contactez-nous pour l’annuler.');
    }
    await this.prisma.$transaction((tx) => this.annulerDans(tx, c.id, c.statut, clientId, 'Annulée par le client'));
    return this.lireClient(clientId, numero);
  }

  async preremplissage(clientId: string): Promise<PreremplissageCommande> {
    const [client, derniere] = await Promise.all([
      this.prisma.utilisateur.findUnique({ where: { id: clientId }, select: { nom: true, telephone: true } }),
      this.prisma.commande.findFirst({ where: { clientId }, orderBy: { creeLe: 'desc' }, select: { adresse: true, zoneId: true } }),
    ]);
    const a = derniere ? versAdresse(derniere.adresse) : null;
    return {
      nom: a?.nom || client?.nom || '',
      telephone: a?.telephone || client?.telephone || '',
      zoneId: derniere?.zoneId ?? null,
      quartier: a?.quartier ?? '',
      repere: a?.repere ?? '',
    };
  }

  // ——— Côté administration ———

  async listerAdmin(c: { statut?: StatutCommande | 'a-traiter'; q?: string; page?: number; clientId?: string }): Promise<ListeCommandesAdmin> {
    const page = c.page ?? 1;
    const recherche: Prisma.CommandeWhereInput = c.q
      ? {
          OR: [
            { numero: { contains: c.q.trim(), mode: 'insensitive' } },
            { client: { nom: { contains: c.q.trim(), mode: 'insensitive' } } },
            { client: { telephone: { contains: c.q.replace(/\s/g, '') } } },
          ],
        }
      : {};
    const base: Prisma.CommandeWhereInput = { ...recherche, ...(c.clientId ? { clientId: c.clientId } : {}) };
    const where: Prisma.CommandeWhereInput = {
      ...base,
      ...(c.statut === 'a-traiter' ? { statut: { in: STATUTS_A_TRAITER } } : c.statut ? { statut: c.statut } : {}),
    };
    const [total, commandes, groupes] = await Promise.all([
      this.prisma.commande.count({ where }),
      this.prisma.commande.findMany({ where, include: INCLUSIONS_LISTE, orderBy: { creeLe: 'desc' }, skip: (page - 1) * PAR_PAGE, take: PAR_PAGE }),
      this.prisma.commande.groupBy({ by: ['statut'], where: base, _count: true }),
    ]);
    return {
      commandes: commandes.map(versListe),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / PAR_PAGE)),
      compteurs: Object.fromEntries(groupes.map((g) => [g.statut, g._count])),
    };
  }

  async lireAdmin(id: string, permissions: readonly string[]): Promise<CommandeAdminDetail> {
    const c = await this.prisma.commande.findUnique({
      where: { id },
      include: {
        ...INCLUSIONS_DETAIL,
        client: { select: { id: true, nom: true, telephone: true, email: true } },
        missions: {
          orderBy: { affecteeLe: 'desc' },
          take: 1,
          include: { livreur: { include: { utilisateur: { select: { id: true, nom: true, telephone: true } } } }, encaissement: true },
        },
      },
    });
    if (!c) throw introuvable();
    const m = c.missions[0];
    return {
      ...versClient(c),
      zoneId: c.zoneId,
      historique: c.historique.map((h) => ({ statut: h.a, date: h.date.toISOString(), motif: h.motif, acteur: h.acteur?.nom ?? null })),
      client: c.client,
      mission: m
        ? {
            id: m.id,
            statut: m.statut,
            livreur: m.livreur.utilisateur,
            affecteeLe: m.affecteeLe.toISOString(),
            livreeLe: m.livreeLe?.toISOString() ?? null,
            motif: m.motif,
          }
        : null,
      encaissement: m?.encaissement
        ? { montant: m.encaissement.montant, mode: m.encaissement.mode, statut: m.encaissement.statut, encaisseLe: m.encaissement.encaisseLe.toISOString() }
        : null,
      actions: actionsPossibles(c.statut, permissions),
    };
  }

  async agir(id: string, e: EcritureActionCommande, acteur: JetonAcces): Promise<CommandeAdminDetail> {
    const transition = TRANSITIONS[e.action];
    if (!acteur.permissions.includes(transition.permission)) {
      throw new Probleme('permission-manquante', HttpStatus.FORBIDDEN, "Vous n'avez pas accès à cette action", undefined, {
        permission: transition.permission,
      });
    }
    const commande = await this.prisma.commande.findUnique({ where: { id }, include: { lignes: true } });
    if (!commande) throw introuvable();
    if (!transition.de.includes(commande.statut)) {
      throw new Probleme('transition-impossible', HttpStatus.CONFLICT, 'Cette action n’est plus possible', 'La commande a changé : rechargez la page.');
    }
    const motif = e.motif?.trim() || null;
    if ((e.action === 'annuler' || e.action === 'echec') && !motif) {
      throw new Probleme('motif-requis', HttpStatus.BAD_REQUEST, 'Indiquez le motif');
    }

    await this.prisma.$transaction(async (tx) => {
      if (e.action === 'annuler') {
        await this.annulerDans(tx, id, commande.statut, acteur.sub, motif ?? '');
        return;
      }
      await this.changerStatut(tx, id, commande.statut, transition.vers, acteur.sub, motif);
      const mission = await tx.mission.findFirst({ where: { commandeId: id, statut: { in: [...MISSIONS_ACTIVES] } } });

      switch (e.action) {
        case 'affecter': {
          if (!e.livreurId) throw new Probleme('livreur-requis', HttpStatus.BAD_REQUEST, 'Choisissez un livreur');
          const livreur = await tx.livreur.findFirst({ where: { utilisateurId: e.livreurId, utilisateur: { actif: true, supprimeLe: null } } });
          if (!livreur) throw new Probleme('livreur-invalide', HttpStatus.BAD_REQUEST, 'Ce livreur n’est pas actif');
          if (mission) {
            if (mission.livreurId === e.livreurId) throw new Probleme('deja-affectee', HttpStatus.CONFLICT, 'Ce livreur a déjà la commande');
            await tx.mission.update({ where: { id: mission.id }, data: { statut: 'REFUSEE', motif: 'Réaffectée à un autre livreur' } });
          }
          // En attendant l'application livreur, l'équipe accepte la mission pour lui.
          const code = randomInt(0, 10_000).toString().padStart(4, '0');
          await tx.mission.create({
            data: {
              commandeId: id,
              livreurId: e.livreurId,
              affecteePar: acteur.sub,
              statut: 'ACCEPTEE',
              accepteeLe: new Date(),
              codeHash: createHash('sha256').update(`${id}:${code}`).digest('hex'),
            },
          });
          break;
        }
        case 'expedier':
          if (!mission) throw new Probleme('livreur-requis', HttpStatus.CONFLICT, 'Affectez d’abord un livreur');
          await tx.mission.update({ where: { id: mission.id }, data: { statut: 'EN_COURS' } });
          break;
        case 'livrer': {
          if (!mission) throw new Probleme('livreur-requis', HttpStatus.CONFLICT, 'Aucun livreur sur cette commande');
          await tx.mission.update({ where: { id: mission.id }, data: { statut: 'LIVREE', livreeLe: new Date() } });
          for (const l of commande.lignes) {
            const { count } = await tx.stock.updateMany({
              where: { produitId: l.produitId, reserve: { gte: l.quantite } },
              data: { reserve: { decrement: l.quantite }, version: { increment: 1 } },
            });
            if (!count) throw new Probleme('stock-incoherent', HttpStatus.CONFLICT, `Réservation introuvable pour ${l.libelle}`);
            await tx.produit.update({ where: { id: l.produitId }, data: { nbVentes: { increment: l.quantite } } });
          }
          await tx.mouvementStock.createMany({
            data: commande.lignes.map((l) => ({
              produitId: l.produitId,
              commandeId: id,
              type: 'SORTIE' as const,
              quantite: l.quantite,
              motif: `Livraison ${commande.numero}`,
              acteurId: acteur.sub,
            })),
          });
          if (commande.moyen === 'A_LA_LIVRAISON' && commande.total > 0) {
            await tx.encaissement.create({
              data: { missionId: mission.id, livreurId: mission.livreurId, montant: commande.total, mode: e.mode ?? 'ESPECES' },
            });
          }
          break;
        }
        case 'echec':
          if (mission) await tx.mission.update({ where: { id: mission.id }, data: { statut: 'ECHEC', motif } });
          break;
        case 'retour':
          await this.rendreStock(tx, commande.id, commande.numero, commande.lignes, 'REINTEGRATION', acteur.sub);
          break;
      }
      await tx.journalAudit.create({
        data: { acteurId: acteur.sub, action: `commande.${e.action}`, entite: 'commande', entiteId: id, apres: { statut: transition.vers, motif } },
      });
    });
    return this.lireAdmin(id, acteur.permissions);
  }

  async resumeVentes(): Promise<ResumeVentes> {
    const debutJour = new Date();
    debutJour.setUTCHours(0, 0, 0, 0); // Bamako est à UTC+0.
    const [aTraiter, enLivraison, jour, dernieres] = await Promise.all([
      this.prisma.commande.count({ where: { statut: { in: STATUTS_A_TRAITER } } }),
      this.prisma.commande.count({ where: { statut: { in: ['AFFECTEE', 'EN_COURS_LIVRAISON'] } } }),
      this.prisma.commande.aggregate({ where: { creeLe: { gte: debutJour }, statut: { notIn: ['ANNULEE', 'RETOUR_ENTREPOT'] } }, _sum: { total: true }, _count: true }),
      this.prisma.commande.findMany({ include: INCLUSIONS_LISTE, orderBy: { creeLe: 'desc' }, take: 6 }),
    ]);
    return {
      aTraiter,
      enLivraison,
      chiffreDuJour: jour._sum.total ?? 0,
      commandesDuJour: jour._count,
      dernieres: dernieres.map(versListe),
    };
  }

  // ——— Outils ———

  private async changerStatut(
    tx: Prisma.TransactionClient,
    id: string,
    de: StatutCommande,
    a: StatutCommande,
    acteurId: string,
    motif: string | null,
  ): Promise<void> {
    // Seule la première de deux actions simultanées passe : l'autre trouve un statut différent.
    const { count } = await tx.commande.updateMany({ where: { id, statut: de }, data: { statut: a } });
    if (!count) throw new Probleme('transition-impossible', HttpStatus.CONFLICT, 'La commande vient de changer', 'Rechargez la page.');
    if (de !== a) await tx.historiqueStatut.create({ data: { commandeId: id, de, a, acteurId, motif } });
  }

  private async annulerDans(tx: Prisma.TransactionClient, id: string, de: StatutCommande, acteurId: string, motif: string): Promise<void> {
    const commande = await tx.commande.findUniqueOrThrow({ where: { id }, include: { lignes: true } });
    await this.changerStatut(tx, id, de, 'ANNULEE', acteurId, motif);
    await tx.mission.updateMany({ where: { commandeId: id, statut: { in: [...MISSIONS_ACTIVES] } }, data: { statut: 'REFUSEE', motif: 'Commande annulée' } });
    await this.rendreStock(tx, id, commande.numero, commande.lignes, 'LIBERATION', acteurId);
    await tx.journalAudit.create({ data: { acteurId, action: 'commande.annuler', entite: 'commande', entiteId: id, apres: { motif } } });
  }

  /** Rend au stock disponible ce qui était réservé (annulation ou retour à l'entrepôt). */
  private async rendreStock(
    tx: Prisma.TransactionClient,
    commandeId: string,
    numero: string,
    lignes: { produitId: string; quantite: number; libelle: string }[],
    type: 'LIBERATION' | 'REINTEGRATION',
    acteurId: string,
  ): Promise<void> {
    for (const l of lignes) {
      const { count } = await tx.stock.updateMany({
        where: { produitId: l.produitId, reserve: { gte: l.quantite } },
        data: { reserve: { decrement: l.quantite }, disponible: { increment: l.quantite }, version: { increment: 1 } },
      });
      if (!count) throw new Probleme('stock-incoherent', HttpStatus.CONFLICT, `Réservation introuvable pour ${l.libelle}`);
    }
    await tx.mouvementStock.createMany({
      data: lignes.map((l) => ({
        produitId: l.produitId,
        commandeId,
        type,
        quantite: l.quantite,
        motif: `${type === 'LIBERATION' ? 'Annulation' : 'Retour'} ${numero}`,
        acteurId,
      })),
    });
  }
}
