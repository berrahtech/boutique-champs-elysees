// Fichier généré par tools/jetons/generer.mjs depuis libs/design-tokens/src : ne pas modifier.

export const jetons = {
  "couleurs": {
    "navy": "#02027E",
    "navy-700": "#03035F",
    "navy-500": "#1C1CB0",
    "gold": "#D4A62A",
    "gold-bright": "#E9BE3F",
    "gold-deep": "#B8871A",
    "gold-soft": "#F8EFD4",
    "gold-text": "#8A6410",
    "primaire-soft": "#E9EAFC",
    "nuit-claire": "#2A2A9C",
    "surface": "#FFFFFF",
    "surface-douce": "#F6F7FA",
    "ink": "#23232E",
    "ink-muted": "#5F6374",
    "line": "#E8EAF0",
    "line-fort": "#CDD0DC",
    "success": "#1B7A4B",
    "success-soft": "#E4F4EB",
    "danger": "#C4231C",
    "danger-soft": "#FCE8E6",
    "info-soft": "#E6EFF8",
    "neutre-soft": "#ECEDF1",
    "promo": "#D7231E",
    "nouveaute": "#5A0FA8",
    "etoile": "#F59E0B",
    "fond-banniere": "#DCE3EC",
    "peche": "#FAD6C7",
    "lilas": "#E4CFE8",
    "on-gold": "#0B1C3F",
    "on-navy": "#FFFFFF",
    "focus": "#1C1CB0",
    "adm-bg": "#F4F5F9"
  },
  "polices": {
    "titre": "Figtree",
    "texte": "Figtree"
  },
  "typographie": {
    "display": {
      "police": "titre",
      "taille": 38,
      "interligne": 44,
      "graisse": 700,
      "espacement": -0.025,
      "tailleMobile": 30,
      "interligneMobile": 36
    },
    "h1": {
      "police": "titre",
      "taille": 26,
      "interligne": 32,
      "graisse": 700,
      "espacement": -0.015,
      "tailleMobile": 26,
      "interligneMobile": 32
    },
    "h2": {
      "police": "titre",
      "taille": 22,
      "interligne": 28,
      "graisse": 600,
      "espacement": -0.01,
      "tailleMobile": 22,
      "interligneMobile": 28
    },
    "h3": {
      "police": "titre",
      "taille": 18,
      "interligne": 26,
      "graisse": 600
    },
    "body-lg": {
      "police": "texte",
      "taille": 16,
      "interligne": 24,
      "graisse": 400
    },
    "body": {
      "police": "texte",
      "taille": 15,
      "interligne": 22,
      "graisse": 400
    },
    "label": {
      "police": "texte",
      "taille": 14,
      "interligne": 20,
      "graisse": 600
    },
    "small": {
      "police": "texte",
      "taille": 13,
      "interligne": 18,
      "graisse": 400
    },
    "surtitre": {
      "police": "texte",
      "taille": 13,
      "interligne": 18,
      "graisse": 600
    },
    "prix": {
      "police": "texte",
      "taille": 18,
      "interligne": 24,
      "graisse": 600,
      "chiffresTabulaires": true
    }
  },
  "espacements": {
    "1": 4,
    "2": 8,
    "3": 12,
    "4": 16,
    "5": 24,
    "6": 32,
    "7": 48,
    "8": 64
  },
  "rayons": {
    "badge": 6,
    "controle": 8,
    "carte-mobile": 8,
    "carte": 10,
    "pastille": 999
  },
  "ombres": {
    "card": "0 4px 18px rgba(22, 24, 70, 0.08)"
  },
  "mise-en-page": {
    "marge-ordinateur": 32,
    "marge-mobile": 16,
    "largeur-max": 1280,
    "cible-tactile": 44,
    "bouton-mobile": 52
  }
} as const;

export type CouleurLce = keyof typeof jetons.couleurs;
export type StyleTexteLce = keyof typeof jetons.typographie;
