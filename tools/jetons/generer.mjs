// Génère les jetons de design et les icônes pour chaque plateforme à partir de
// libs/design-tokens/src/jetons.json et icones.json (sources uniques) :
//   - libs/design-tokens/src/lib/jetons.ts      constantes TypeScript
//   - libs/ui/src/styles/_jetons.scss           variables CSS (Angular)
//   - libs/ui/src/styles/_typographie.scss      mixins de texte (Angular)
//   - mobile/lce_ui/lib/src/jetons.g.dart       constantes Dart (Flutter)
//   - libs/ui/src/lib/icone/icones.ts           tracés des icônes (Angular)
//   - mobile/lce_ui/lib/src/icones.g.dart       tracés des icônes (Flutter)
//
// Usage : npx nx run design-tokens:generer
// Option --verifier : échoue si un fichier généré n'est pas à jour (CI).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const jetons = JSON.parse(readFileSync(resolve(racine, 'libs/design-tokens/src/jetons.json'), 'utf8'));
const { icones } = JSON.parse(readFileSync(resolve(racine, 'libs/design-tokens/src/icones.json'), 'utf8'));
const verifier = process.argv.includes('--verifier');
const entete = 'Fichier généré par tools/jetons/generer.mjs depuis libs/design-tokens/src : ne pas modifier.';

const camel = (nom) => nom.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

function genererTs() {
  const { $description, ...donnees } = jetons;
  return `// ${entete}\n\nexport const jetons = ${JSON.stringify(donnees, null, 2)} as const;\n\n` +
    `export type CouleurLce = keyof typeof jetons.couleurs;\n` +
    `export type StyleTexteLce = keyof typeof jetons.typographie;\n`;
}

function genererScss() {
  const l = [`// ${entete}`, '', ':root {'];
  for (const [nom, valeur] of Object.entries(jetons.couleurs)) l.push(`  --lce-${nom}: ${valeur};`);
  l.push('');
  l.push(`  --lce-police-titre: '${jetons.polices.titre}', Georgia, serif;`);
  l.push(`  --lce-police-texte: '${jetons.polices.texte}', system-ui, sans-serif;`);
  l.push('');
  for (const [nom, valeur] of Object.entries(jetons.espacements)) l.push(`  --lce-espace-${nom}: ${valeur}px;`);
  for (const [nom, valeur] of Object.entries(jetons.rayons)) l.push(`  --lce-rayon-${nom}: ${valeur}px;`);
  for (const [nom, valeur] of Object.entries(jetons.ombres)) l.push(`  --lce-ombre-${nom}: ${valeur};`);
  for (const [nom, valeur] of Object.entries(jetons['mise-en-page'])) l.push(`  --lce-${nom}: ${valeur}px;`);
  l.push('}', '');
  return l.join('\n');
}

// Mixins seules (aucune règle CSS émise) : importable dans chaque composant
// sans dupliquer les variables.
function genererTypographie() {
  const l = [`// ${entete}`, ''];
  // Une mixin par style de texte, avec la taille mobile quand elle existe.
  for (const [nom, s] of Object.entries(jetons.typographie)) {
    l.push(`@mixin texte-${nom} {`);
    l.push(`  font-family: var(--lce-police-${s.police});`);
    l.push(`  font-size: ${s.taille}px;`);
    l.push(`  line-height: ${s.interligne}px;`);
    l.push(`  font-weight: ${s.graisse};`);
    if (s.espacement) l.push(`  letter-spacing: ${s.espacement}em;`);
    if (s.capitales) l.push('  text-transform: uppercase;');
    if (s.chiffresTabulaires) l.push('  font-variant-numeric: tabular-nums;');
    if (s.tailleMobile) {
      l.push('  @media (max-width: 767px) {');
      l.push(`    font-size: ${s.tailleMobile}px;`);
      l.push(`    line-height: ${s.interligneMobile}px;`);
      l.push('  }');
    }
    l.push('}', '');
  }
  return l.join('\n');
}

function couleurDart(hex) {
  return `Color(0xFF${hex.slice(1).toUpperCase()})`;
}

function genererDart() {
  const l = [`// ${entete}`, '', "import 'package:flutter/painting.dart';", ''];
  l.push('/// Couleurs LCE (thème clair).', 'abstract final class CouleursLce {');
  for (const [nom, valeur] of Object.entries(jetons.couleurs)) {
    l.push(`  static const ${camel(nom)} = ${couleurDart(valeur)};`);
  }
  l.push('}', '');
  l.push('abstract final class PolicesLce {');
  l.push(`  static const titre = '${jetons.polices.titre}';`);
  l.push(`  static const texte = '${jetons.polices.texte}';`);
  l.push('}', '');
  l.push('/// Échelle d\'espacement : 4, 8, 12, 16, 24, 32, 48, 64.', 'abstract final class EspacesLce {');
  for (const [nom, valeur] of Object.entries(jetons.espacements)) l.push(`  static const double e${nom} = ${valeur};`);
  l.push('}', '');
  l.push('abstract final class RayonsLce {');
  for (const [nom, valeur] of Object.entries(jetons.rayons)) l.push(`  static const double ${camel(nom)} = ${valeur};`);
  l.push('}', '');
  l.push('abstract final class MiseEnPageLce {');
  for (const [nom, valeur] of Object.entries(jetons['mise-en-page'])) l.push(`  static const double ${camel(nom)} = ${valeur};`);
  l.push('}', '');
  // Sur mobile, on applique directement la taille mobile quand elle existe.
  l.push('/// Styles de texte (tailles mobiles).', 'abstract final class TextesLce {');
  for (const [nom, s] of Object.entries(jetons.typographie)) {
    const taille = s.tailleMobile ?? s.taille;
    const interligne = s.interligneMobile ?? s.interligne;
    const extras = [];
    if (s.espacement) extras.push(`letterSpacing: ${(s.espacement * taille).toFixed(2)}`);
    if (s.chiffresTabulaires) extras.push('fontFeatures: [FontFeature.tabularFigures()]');
    l.push(`  static const ${camel(nom)} = TextStyle(`);
    l.push(`    fontFamily: PolicesLce.${s.police},`);
    l.push(`    fontSize: ${taille},`);
    l.push(`    height: ${(interligne / taille).toFixed(3)},`);
    l.push(`    fontWeight: FontWeight.w${s.graisse},`);
    for (const e of extras) l.push(`    ${e},`);
    l.push('  );');
  }
  l.push('}', '');
  return l.join('\n');
}

function genererIconesTs() {
  const l = [`// ${entete}`, '', '/** Tracés des icônes (contenu d’un `<svg viewBox="0 0 24 24">`). */', 'export const ICONES = {'];
  for (const [nom, trace] of Object.entries(icones)) l.push(`  ${JSON.stringify(nom)}: ${JSON.stringify(trace)},`);
  l.push('} as const;', '', 'export type NomIcone = keyof typeof ICONES;', '');
  return l.join('\n');
}

function genererIconesDart() {
  const l = [`// ${entete}`, '', '/// Noms des icônes LCE.', 'enum IconeLce {'];
  for (const nom of Object.keys(icones)) l.push(`  ${camel(nom)},`);
  l.push('}', '', '/// Tracés des icônes (contenu d’un `<svg viewBox="0 0 24 24">`).', 'const tracesIcones = <IconeLce, String>{');
  for (const [nom, trace] of Object.entries(icones)) l.push(`  IconeLce.${camel(nom)}: r'${trace}',`);
  l.push('};', '');
  return l.join('\n');
}

const sorties = [
  ['libs/design-tokens/src/lib/jetons.ts', genererTs()],
  ['libs/ui/src/styles/_jetons.scss', genererScss()],
  ['libs/ui/src/styles/_typographie.scss', genererTypographie()],
  ['mobile/lce_ui/lib/src/jetons.g.dart', genererDart()],
  ['libs/ui/src/lib/icone/icones.ts', genererIconesTs()],
  ['mobile/lce_ui/lib/src/icones.g.dart', genererIconesDart()],
];

let perimes = 0;
for (const [chemin, contenu] of sorties) {
  const complet = resolve(racine, chemin);
  const actuel = existsSync(complet) ? readFileSync(complet, 'utf8') : null;
  if (actuel === contenu) continue;
  if (verifier) {
    console.error(`Jetons périmés : ${chemin}`);
    perimes++;
    continue;
  }
  mkdirSync(dirname(complet), { recursive: true });
  writeFileSync(complet, contenu);
  console.log(`Écrit ${chemin}`);
}
if (perimes) {
  console.error('Lancez : npx nx run design-tokens:generer');
  process.exit(1);
}
