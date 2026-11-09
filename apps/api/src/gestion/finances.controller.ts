import { Controller, Get, Injectable, Query } from '@nestjs/common';
import type { MoyenPaiement, PointSerie, RapportFinances } from '@lce/contrats';
import { IsIn, IsOptional } from 'class-validator';
import { PrismaService } from '../commun/prisma/prisma.service';
import { Permission } from '../identite/gardes';

export type Periode = '7j' | '30j' | '12m';

class CriteresFinancesDto {
  @IsOptional() @IsIn(['7j', '30j', '12m'])
  periode?: Periode;
}

/** Début de la période, à minuit (Bamako est à UTC+0). */
export function debutDePeriode(periode: Periode, maintenant: Date): Date {
  const d = new Date(maintenant);
  d.setUTCHours(0, 0, 0, 0);
  if (periode === '12m') {
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - 11);
  } else {
    d.setUTCDate(d.getUTCDate() - (periode === '7j' ? 6 : 29));
  }
  return d;
}

/** Toutes les périodes de la série, même vides : la courbe ne saute pas de jours. */
export function periodesDe(periode: Periode, debut: Date, maintenant: Date): string[] {
  const cles: string[] = [];
  const d = new Date(debut);
  while (d <= maintenant) {
    cles.push(cleDe(periode, d));
    if (periode === '12m') d.setUTCMonth(d.getUTCMonth() + 1);
    else d.setUTCDate(d.getUTCDate() + 1);
  }
  return cles;
}

function cleDe(periode: Periode, date: Date): string {
  return date.toISOString().slice(0, periode === '12m' ? 7 : 10);
}

@Injectable()
export class FinancesService {
  constructor(private readonly prisma: PrismaService) {}

  async rapport(periode: Periode): Promise<RapportFinances> {
    const maintenant = new Date();
    const debut = debutDePeriode(periode, maintenant);
    const [commandes, caisse] = await Promise.all([
      this.prisma.commande.findMany({
        where: { creeLe: { gte: debut } },
        select: {
          statut: true,
          moyen: true,
          total: true,
          remise: true,
          fraisLivraison: true,
          creeLe: true,
          zone: { select: { nom: true } },
          lignes: { select: { produitId: true, libelle: true, quantite: true, prixUnitaire: true } },
        },
      }),
      this.prisma.encaissement.aggregate({ where: { statut: 'A_REVERSER' }, _sum: { montant: true } }),
    ]);

    const livrees = commandes.filter((c) => c.statut === 'LIVREE');
    const chiffreAffaires = livrees.reduce((s, c) => s + c.total, 0);

    const serie = new Map<string, PointSerie>(periodesDe(periode, debut, maintenant).map((p) => [p, { periode: p, chiffre: 0, commandes: 0 }]));
    const parMoyen = new Map<MoyenPaiement, { chiffre: number; commandes: number }>();
    const parZone = new Map<string, { chiffre: number; commandes: number }>();
    const produits = new Map<string, { produitId: string; libelle: string; quantite: number; chiffre: number }>();

    for (const c of livrees) {
      const point = serie.get(cleDe(periode, c.creeLe));
      if (point) {
        point.chiffre += c.total;
        point.commandes += 1;
      }
      const m = parMoyen.get(c.moyen) ?? { chiffre: 0, commandes: 0 };
      parMoyen.set(c.moyen, { chiffre: m.chiffre + c.total, commandes: m.commandes + 1 });
      const z = parZone.get(c.zone.nom) ?? { chiffre: 0, commandes: 0 };
      parZone.set(c.zone.nom, { chiffre: z.chiffre + c.total, commandes: z.commandes + 1 });
      for (const l of c.lignes) {
        const p = produits.get(l.produitId) ?? { produitId: l.produitId, libelle: l.libelle, quantite: 0, chiffre: 0 };
        produits.set(l.produitId, { ...p, quantite: p.quantite + l.quantite, chiffre: p.chiffre + l.quantite * l.prixUnitaire });
      }
    }

    return {
      debut: debut.toISOString(),
      fin: maintenant.toISOString(),
      chiffreAffaires,
      commandesLivrees: livrees.length,
      panierMoyen: livrees.length ? Math.round(chiffreAffaires / livrees.length) : 0,
      commandesPassees: commandes.filter((c) => c.statut !== 'ANNULEE').length,
      commandesAnnulees: commandes.filter((c) => c.statut === 'ANNULEE').length,
      remises: livrees.reduce((s, c) => s + c.remise, 0),
      fraisLivraison: livrees.reduce((s, c) => s + c.fraisLivraison, 0),
      aReverser: caisse._sum.montant ?? 0,
      serie: [...serie.values()],
      parMoyen: [...parMoyen].map(([moyen, v]) => ({ moyen, ...v })).sort((a, b) => b.chiffre - a.chiffre),
      parZone: [...parZone].map(([zone, v]) => ({ zone, ...v })).sort((a, b) => b.chiffre - a.chiffre),
      meilleursProduits: [...produits.values()].sort((a, b) => b.chiffre - a.chiffre).slice(0, 5),
    };
  }
}

/** Chiffre d'affaires et indicateurs, calculés sur les commandes livrées. */
@Controller('admin/finances')
export class FinancesController {
  constructor(private readonly service: FinancesService) {}

  @Get()
  @Permission('rapport.voir')
  rapport(@Query() criteres: CriteresFinancesDto) {
    return this.service.rapport(criteres.periode ?? '30j');
  }
}
