import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app/app.module';
import { configurerApplication } from '../application';
import { PrismaService } from '../commun/prisma/prisma.service';
import { PasserelleEmail } from '../identite/email/passerelle-email';
import { PasserelleSms } from '../identite/sms/passerelle-sms';

/**
 * Parcours complet d'une commande payée à la livraison, sur la vraie base :
 * réservation du stock, préparation, affectation, livraison, encaissement, remise.
 * Un produit et une zone propres au test évitent de toucher au catalogue de démonstration.
 */
const graine = Date.now().toString().slice(-6);

describe('Commandes (intégration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let jetonClient: string;
  let jetonAdmin: string;
  let produitId: string;
  let zoneId: string;
  let comptes: string[] = [];
  const api = () => request(app.getHttpServer());
  const stock = () => prisma.stock.findUniqueOrThrow({ where: { produitId } });

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PasserelleSms)
      .useValue({ envoyer: async () => undefined })
      .overrideProvider(PasserelleEmail)
      .useValue({ envoyer: async () => undefined })
      .compile();
    app = configurerApplication(module.createNestApplication<NestExpressApplication>());
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);

    const [roleClient, roleAdmin, categorie, permissions] = await Promise.all([
      prisma.role.findUniqueOrThrow({ where: { nom: 'Client' } }),
      prisma.role.findUniqueOrThrow({ where: { nom: 'Administrateur' } }),
      prisma.categorie.findFirstOrThrow(),
      prisma.permission.findMany({ select: { code: true } }),
    ]);
    const client = await prisma.utilisateur.create({ data: { nom: 'Test Intégration', telephone: `+2236${graine}1`, roleId: roleClient.id } });
    const admin = await prisma.utilisateur.create({ data: { nom: 'Admin Intégration', telephone: `+2236${graine}2`, roleId: roleAdmin.id } });
    comptes = [client.id, admin.id];
    jetonClient = await jwt.signAsync({ sub: client.id, role: 'Client', permissions: [] }, { expiresIn: 600 });
    jetonAdmin = await jwt.signAsync({ sub: admin.id, role: 'Administrateur', permissions: permissions.map((p) => p.code) }, { expiresIn: 600 });

    const produit = await prisma.produit.create({
      data: { nom: `Produit test ${graine}`, slug: `produit-test-${graine}`, categorieId: categorie.id, prix: 10_000, publie: true, stock: { create: { disponible: 10 } } },
    });
    produitId = produit.id;
    zoneId = (await prisma.zone.create({ data: { nom: `Zone test ${graine}`, frais: 1_000, delaiHeures: 24 } })).id;
  });

  afterAll(async () => {
    // Le produit et la zone de test sortent du catalogue ; l'historique des commandes reste, comme en vrai.
    await prisma.produit.update({ where: { id: produitId }, data: { publie: false, supprimeLe: new Date() } });
    await prisma.zone.update({ where: { id: zoneId }, data: { actif: false } });
    // Les comptes de test ne restent jamais actifs : surtout pas un administrateur.
    const livreurs = await prisma.livreur.findMany({ where: { livreurZones: { some: { zoneId } } }, select: { utilisateurId: true } });
    await prisma.utilisateur.updateMany({
      where: { id: { in: [...comptes, ...livreurs.map((l) => l.utilisateurId)] } },
      data: { actif: false, supprimeLe: new Date() },
    });
    await app.close();
  });

  const commander = (quantite: number, moyen = 'A_LA_LIVRAISON') =>
    api()
      .post('/api/v1/commandes')
      .set('Authorization', `Bearer ${jetonClient}`)
      .send({
        lignes: [{ produitId, quantite }],
        zoneId,
        moyen,
        adresse: { nom: 'Test Intégration', telephone: '76 00 00 01', quartier: 'Badalabougou', repere: 'Près du pont' },
      });

  const agir = (id: string, corps: Record<string, unknown>) =>
    api().post(`/api/v1/admin/commandes/${id}/actions`).set('Authorization', `Bearer ${jetonAdmin}`).send(corps);

  it('refuse un moyen de paiement pas encore ouvert', async () => {
    const r = await commander(1, 'ORANGE_MONEY').expect(400);
    expect(r.body.type).toBe('/problemes/moyen-indisponible');
  });

  it('livre une commande de bout en bout, stock et caisse compris', async () => {
    const creee = await commander(2).expect(201);
    expect(creee.body.statut).toBe('CONFIRMEE');
    expect(creee.body.total).toBe(2 * 10_000 + 1_000);
    expect(await stock()).toMatchObject({ disponible: 8, reserve: 2 });

    const id = creee.body.id as string;
    // L'ordre est imposé : on ne livre pas une commande qui n'est pas partie.
    expect((await agir(id, { action: 'livrer' }).expect(409)).body.type).toBe('/problemes/transition-impossible');

    await agir(id, { action: 'preparer' }).expect(200);
    await agir(id, { action: 'prete' }).expect(200);

    const livreurs = await api()
      .post('/api/v1/admin/livreurs')
      .set('Authorization', `Bearer ${jetonAdmin}`)
      .send({ nom: 'Livreur Intégration', telephone: `6${graine}3`, zoneIds: [zoneId] })
      .expect(201);
    const livreur = livreurs.body.find((l: { nom: string }) => l.nom === 'Livreur Intégration');

    await agir(id, { action: 'affecter', livreurId: livreur.id }).expect(200);
    await agir(id, { action: 'expedier' }).expect(200);
    const livree = await agir(id, { action: 'livrer', mode: 'ESPECES' }).expect(200);
    expect(livree.body.statut).toBe('LIVREE');
    expect(livree.body.encaissement).toMatchObject({ montant: 21_000, mode: 'ESPECES', statut: 'A_REVERSER' });
    expect(livree.body.historique.map((h: { statut: string }) => h.statut)).toEqual([
      'CONFIRMEE',
      'EN_PREPARATION',
      'EN_ATTENTE_AFFECTATION',
      'AFFECTEE',
      'EN_COURS_LIVRAISON',
      'LIVREE',
    ]);
    expect(await stock()).toMatchObject({ disponible: 8, reserve: 0 });

    const caisse = await api().get(`/api/v1/admin/livreurs/${livreur.id}/caisse`).set('Authorization', `Bearer ${jetonAdmin}`).expect(200);
    expect(caisse.body.livreur.aReverser).toBe(21_000);
    const apres = await api().post(`/api/v1/admin/livreurs/${livreur.id}/reversements`).set('Authorization', `Bearer ${jetonAdmin}`).expect(201);
    expect(apres.body.livreur.aReverser).toBe(0);
    expect(apres.body.reversements[0]).toMatchObject({ montant: 21_000, statut: 'REVERSE' });

    const suivi = await api().get(`/api/v1/commandes/${creee.body.numero}`).set('Authorization', `Bearer ${jetonClient}`).expect(200);
    expect(suivi.body.statut).toBe('LIVREE');
  });

  it('rend le stock quand le client annule', async () => {
    const creee = await commander(3).expect(201);
    expect(await stock()).toMatchObject({ disponible: 5, reserve: 3 });
    const annulee = await api().post(`/api/v1/commandes/${creee.body.numero}/annulation`).set('Authorization', `Bearer ${jetonClient}`).expect(200);
    expect(annulee.body.statut).toBe('ANNULEE');
    expect(await stock()).toMatchObject({ disponible: 8, reserve: 0 });
  });

  it('refuse une commande plus grande que le stock', async () => {
    const r = await commander(50).expect(409);
    expect(r.body.type).toBe('/problemes/panier-modifie');
    expect(await stock()).toMatchObject({ disponible: 8, reserve: 0 });
  });

  it('un échec de livraison peut finir en retour à l’entrepôt', async () => {
    const { body } = await commander(1).expect(201);
    const livreur = await prisma.livreur.findFirstOrThrow({ where: { livreurZones: { some: { zoneId } } } });
    for (const action of ['preparer', 'prete']) await agir(body.id, { action }).expect(200);
    await agir(body.id, { action: 'affecter', livreurId: livreur.utilisateurId }).expect(200);
    await agir(body.id, { action: 'expedier' }).expect(200);
    expect((await agir(body.id, { action: 'echec' }).expect(400)).body.type).toBe('/problemes/motif-requis');
    await agir(body.id, { action: 'echec', motif: 'Client injoignable' }).expect(200);
    const retour = await agir(body.id, { action: 'retour' }).expect(200);
    expect(retour.body.statut).toBe('RETOUR_ENTREPOT');
    expect(await stock()).toMatchObject({ disponible: 8, reserve: 0 });
  });

  it('les finances comptent les commandes livrées', async () => {
    const r = await api().get('/api/v1/admin/finances').query({ periode: '7j' }).set('Authorization', `Bearer ${jetonAdmin}`).expect(200);
    expect(r.body.chiffreAffaires).toBeGreaterThanOrEqual(21_000);
    expect(r.body.serie).toHaveLength(7);
  });
});
