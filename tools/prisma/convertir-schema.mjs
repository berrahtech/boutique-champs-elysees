// Convertit le schéma produit par `prisma db pull` aux conventions TypeScript.
//
// Le schéma SQL (apps/api/prisma/migrations) est la source de vérité. Après
// chaque nouvelle migration : `npx nx run api:prisma-schema`, qui enchaîne
// migrate deploy → db pull → ce script → prisma format → prisma generate.
//
// Ce que fait le script :
//   - modèles et énumérations en PascalCase, champs en camelCase, avec
//     @@map / @map vers les noms SQL ;
//   - listes de relations au pluriel, avec quelques noms choisis à la main ;
//   - retire les index uniques partiels (WHERE …) : Prisma en déduirait une
//     relation 1-1 ou un findUnique trompeur. Ils restent en base et sont
//     signalés en commentaire.

import { readFileSync, writeFileSync } from 'node:fs';

const fichier = process.argv[2] ?? 'apps/api/prisma/schema.prisma';
const source = readFileSync(fichier, 'utf8');

const camel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
const pascal = (s) => camel(s).replace(/^./, (c) => c.toUpperCase());
const pluriel = (s) => (/[sx]$/.test(s) ? s : `${s}s`);

// Noms de relations choisis à la main : modèle SQL → champ de db pull → nom final.
const RENOMMAGES = {
  categorie: { categorie: 'parent', other_categorie: 'enfants' },
  commande: { utilisateur: 'client', ligne_commande: 'lignes', historique_statut: 'historique', transaction_paiement: 'transactions' },
  avis: { utilisateur: 'client' },
  historique_statut: { utilisateur: 'acteur' },
  journal_audit: { utilisateur: 'acteur' },
  mouvement_stock: { utilisateur: 'acteur' },
  mission: { utilisateur: 'affecteePar_' },
  reversement: { utilisateur: 'validateur' },
  utilisateur: {
    commande: 'commandes',
    historique_statut: 'changementsStatut',
    journal_audit: 'actionsAudit',
    mission: 'missionsAffectees',
    mouvement_stock: 'mouvementsStock',
    reversement: 'reversementsValides',
  },
};

// Découpe en blocs « model x { … } ».
const blocs = source.split(/(?=^(?:\/\/\/.*\n)*(?:model|enum|view|generator|datasource) )/m);
const nomDuBloc = (b) => b.match(/^(?:\/\/\/.*\n)*(model|enum|view) (\w+) \{/m);
const modeles = blocs.map(nomDuBloc).filter((m) => m && m[1] === 'model').map((m) => m[2]);
const enums = blocs.map(nomDuBloc).filter((m) => m && m[1] === 'enum').map((m) => m[2]);
const types = new Map([...modeles, ...enums].map((n) => [n, pascal(n)]));

// 1. Repère les uniques partiels à retirer et les relations 1-1 qu'ils induisent.
const uniquesPartiels = []; // { modele, champ, map }
for (const bloc of blocs) {
  const tete = nomDuBloc(bloc);
  if (!tete || tete[1] !== 'model') continue;
  for (const m of bloc.matchAll(/^\s+(\w+)\s+\w+\??\s.*@unique\(map: "(\w+)", where: raw\(/gm)) {
    uniquesPartiels.push({ modele: tete[2], champ: m[1], map: m[2] });
  }
}
// Relations dont la clé étrangère n'est plus unique : le côté inverse devient une liste.
const listesForcees = new Set(); // "modeleCible.modeleSource"
for (const { modele, champ } of uniquesPartiels) {
  const bloc = blocs.find((b) => nomDuBloc(b)?.[2] === modele);
  const re = new RegExp(`^\\s+\\w+\\s+(\\w+)\\??\\s+@relation\\([^)]*fields: \\[${champ}\\]`, 'm');
  const cible = bloc.match(re)?.[1];
  if (cible) listesForcees.add(`${cible}.${modele}`);
}

// 2. Réécrit chaque bloc.
const sortie = blocs.map((bloc) => {
  const tete = nomDuBloc(bloc);
  if (!tete) return bloc;
  const [, genre, nom] = tete;
  const lignes = bloc.split('\n');
  const iTete = lignes.findIndex((l) => l.startsWith(`${genre} ${nom} {`));
  lignes[iTete] = `${genre} ${types.get(nom)} {`;
  const iFin = lignes.lastIndexOf('}');

  if (genre === 'enum') {
    lignes.splice(iFin, 0, '', `  @@map("${nom}")`);
    return lignes.join('\n');
  }

  const renommages = RENOMMAGES[nom] ?? {};
  const resultat = [];
  for (let i = 0; i < lignes.length; i++) {
    const l = lignes[i];
    if (i <= iTete || i >= iFin || !l.trim() || l.trim().startsWith('//')) {
      resultat.push(l);
      continue;
    }
    if (l.trim().startsWith('@@')) {
      resultat.push(l.replace(/\[([^\]]*)\]/, (_, x) => `[${x.split(',').map((s) => s.trim().replace(/^\w+/, camel)).join(', ')}]`));
      continue;
    }
    const m = l.match(/^(\s+)(\w+)\s+(\w+(?:\("[^"]*"\))?)(\[\]|\?)?(.*)$/);
    if (!m) {
      resultat.push(l);
      continue;
    }
    let [, ind, champ, type, mod = '', reste] = m;
    const estRelation = modeles.includes(type);

    // Unique partiel : retiré du schéma Prisma, gardé en base.
    const partiel = reste.match(/@unique\(map: "(\w+)", where: raw\("((?:[^"\\]|\\.)*)"\)\)/);
    if (partiel) {
      resultat.push(`${ind}/// Unique en base seulement si ${partiel[2].replace(/\\"/g, '"')} (index ${partiel[1]}).`);
      reste = reste.replace(partiel[0], '');
    }

    if (estRelation && listesForcees.has(`${nom}.${type}`) && mod === '?') mod = '[]';

    reste = reste
      .replace(/fields: \[([^\]]+)\]/, (_, x) => `fields: [${x.split(',').map((s) => camel(s.trim())).join(', ')}]`)
      .replace(/references: \[([^\]]+)\]/, (_, x) => `references: [${x.split(',').map((s) => camel(s.trim())).join(', ')}]`)
      .replace(/\s+/g, ' ')
      .trimEnd();

    let nouveau = renommages[champ] ?? camel(champ);
    if (estRelation && mod === '[]' && !renommages[champ]) nouveau = pluriel(nouveau);
    if (nouveau.endsWith('_')) nouveau = nouveau.slice(0, -1) + 'Utilisateur';
    if (!estRelation && nouveau !== champ && !reste.includes('@map(')) reste += ` @map("${champ}")`;
    resultat.push(`${ind}${nouveau} ${types.get(type) ?? type}${mod}${reste ? ' ' + reste.trim() : ''}`);
  }
  const iFinResultat = resultat.lastIndexOf('}');
  resultat.splice(iFinResultat, 0, `  @@map("${nom}")`);
  return resultat.join('\n');
});

writeFileSync(fichier, sortie.join(''));
console.log(`Schéma converti : ${modeles.length} modèles, ${enums.length} énumérations, ${uniquesPartiels.length} uniques partiels signalés.`);
