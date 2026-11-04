// Données initiales de développement : zones, catégories, produits de démonstration,
// code promo et compte administrateur. Peut être relancé : rien n'est créé en double.
// Usage : npx nx run api:seed

import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import sharp from 'sharp';
import { PrismaClient } from '../src/generated/prisma/client';
import { hacherMotDePasse } from '../src/identite/mot-de-passe';
import { CATEGORIES, PRODUITS } from './donnees-demo';

const url = new URL(process.env['DATABASE_URL'] ?? '');
const schema = url.searchParams.get('schema') ?? 'lce';
url.searchParams.delete('schema');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }, { schema }) });

const ZONES = [
  { nom: 'Bamako (Communes I à VI)', frais: 1500, delaiHeures: 48 },
  { nom: 'Kati, Kalaban Coro', frais: 3000, delaiHeures: 72 },
  { nom: 'Autres villes', frais: 5000, delaiHeures: 120 },
];

async function principal() {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('Données de démonstration et compte de test : à ne jamais charger en production.');
  }
  for (const z of ZONES) {
    await prisma.zone.upsert({ where: { nom: z.nom }, update: {}, create: z });
  }

  const idsCategories = new Map<string, string>();
  for (const [ordre, c] of CATEGORIES.entries()) {
    const categorie = await prisma.categorie.upsert({
      where: { slug: c.slug },
      update: { nom: c.nom, ordre },
      create: { slug: c.slug, nom: c.nom, ordre },
    });
    idsCategories.set(c.slug, categorie.id);
  }

  let crees = 0;
  for (const p of PRODUITS) {
    const existant = await prisma.produit.findFirst({ where: { slug: p.slug, supprimeLe: null } });
    if (existant) continue;
    await prisma.$transaction(async (tx) => {
      const produit = await tx.produit.create({
        data: {
          slug: p.slug,
          reference: p.reference,
          nom: p.nom,
          categorieId: idsCategories.get(p.categorie)!,
          rayon: p.rayon,
          description: p.description,
          prix: p.prix,
          prixBarre: p.prixBarre ?? null,
          nouveau: p.nouveau ?? false,
          publie: true,
          noteMoyenne: p.noteMoyenne,
          nbAvis: p.nbAvis,
          nbVentes: p.ventes,
          icone: p.icone,
          caracteristiques: p.caracteristiques,
          stock: { create: { disponible: p.stock } },
        },
      });
      if (p.stock > 0) {
        await tx.mouvementStock.create({
          data: { produitId: produit.id, type: 'ENTREE', quantite: p.stock, motif: 'Stock initial de démonstration' },
        });
      }
    });
    crees++;
  }

  const debut = new Date();
  await prisma.codePromo.upsert({
    where: { code: 'BIENVENUE10' },
    update: {},
    create: {
      code: 'BIENVENUE10',
      type: 'POURCENTAGE',
      valeur: 10,
      debut,
      fin: new Date(debut.getTime() + 365 * 86_400_000),
    },
  });

  const telephone = process.env['ADMIN_TELEPHONE'];
  const motDePasse = process.env['ADMIN_MOT_DE_PASSE'];
  if (telephone && motDePasse) {
    const existant = await prisma.utilisateur.findFirst({ where: { telephone, supprimeLe: null } });
    if (!existant) {
      const role = await prisma.role.findUniqueOrThrow({ where: { nom: 'Administrateur' } });
      await prisma.utilisateur.create({
        data: {
          telephone,
          nom: 'Administrateur LCE',
          motDePasseHash: await hacherMotDePasse(motDePasse),
          roleId: role.id,
          deuxFacteurs: true,
        },
      });
      console.log(`Compte administrateur créé pour ${telephone}.`);
    }
  } else {
    console.log('ADMIN_TELEPHONE / ADMIN_MOT_DE_PASSE absents : aucun compte administrateur créé.');
  }

  console.log(`${crees} produit(s) créé(s), ${PRODUITS.length - crees} déjà présent(s).`);
  console.log(`${await ajouterPhotosDemo()} photo(s) de démonstration ajoutée(s).`);
}

/** Photos de prisma/photos-demo/<slug>.jpg, recadrées en carré, pour les produits qui n'en ont aucune. */
async function ajouterPhotosDemo(): Promise<number> {
  // Le seed tourne depuis apps/api, l'API depuis la racine du dépôt : c'est là qu'elle sert /medias.
  const source = join('prisma', 'photos-demo');
  const cible = join('..', '..', process.env['MEDIAS_DOSSIER'] ?? 'medias', 'produits');
  await mkdir(cible, { recursive: true });
  let ajoutees = 0;
  for (const p of PRODUITS) {
    const fichier = join(source, `${p.slug}.jpg`);
    if (!existsSync(fichier)) continue;
    const produit = await prisma.produit.findFirst({ where: { slug: p.slug, supprimeLe: null, imageProduits: { none: {} } } });
    if (!produit) continue;
    const contenu = await readFile(fichier);
    const nom = randomUUID();
    const urls: Record<number, string> = {};
    for (const taille of [200, 400, 800]) {
      await sharp(contenu).resize(taille, taille, { fit: 'cover' }).webp({ quality: 82 }).toFile(join(cible, `${nom}-${taille}.webp`));
      urls[taille] = `/medias/produits/${nom}-${taille}.webp`;
    }
    await prisma.imageProduit.create({ data: { produitId: produit.id, url200: urls[200], url400: urls[400], url800: urls[800], ordre: 0 } });
    ajoutees++;
  }
  return ajoutees;
}

principal()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
