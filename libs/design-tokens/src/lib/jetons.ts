// Fichier généré par tools/jetons/generer.mjs depuis libs/design-tokens/src : ne pas modifier.

export const jetons = {
  "couleurs": {
    "navy": "#191C1F",
    "navy-700": "#000000",
    "navy-500": "#0B5EC7",
    "gold": "#FFB400",
    "gold-bright": "#FFC633",
    "gold-deep": "#B87A00",
    "gold-soft": "#FFF3D1",
    "gold-text": "#7A5600",
    "primaire-soft": "#E8F0FB",
    "nuit-claire": "#2C3136",
    "surface": "#FFFFFF",
    "surface-douce": "#FFFFFF",
    "ink": "#191C1F",
    "ink-muted": "#5F6368",
    "line": "#E6E8EA",
    "line-fort": "#C9CCCF",
    "success": "#1B7A4B",
    "success-soft": "#E4F4EB",
    "danger": "#C4231C",
    "danger-soft": "#FCE8E6",
    "info-soft": "#F1F5F9",
    "neutre-soft": "#F0F1F2",
    "promo": "#D7231E",
    "nouveaute": "#5A0FA8",
    "etoile": "#F59E0B",
    "fond-banniere": "#DCE3EC",
    "peche": "#FAD6C7",
    "lilas": "#E4CFE8",
    "on-gold": "#191C1F",
    "on-navy": "#FFFFFF",
    "focus": "#0B5EC7",
    "adm-bg": "#F4F5F9",
    "noir": "#000000",
    "saisie-fond": "#F1F1F1",
    "facebook": "#166FE5",
    "orange": "#C2570C",
    "creme": "#FFEFC2"
  },
  "polices": {
    "titre": "Lato",
    "texte": "Lato"
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
      "taille": 30,
      "interligne": 38,
      "graisse": 700,
      "tailleMobile": 26,
      "interligneMobile": 32
    },
    "h2": {
      "police": "titre",
      "taille": 22,
      "interligne": 28,
      "graisse": 700
    },
    "h3": {
      "police": "titre",
      "taille": 17,
      "interligne": 24,
      "graisse": 700
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
      "graisse": 700
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
      "graisse": 700
    },
    "prix": {
      "police": "texte",
      "taille": 18,
      "interligne": 24,
      "graisse": 700,
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
    "carte-mobile": 10,
    "carte": 12,
    "pastille": 999
  },
  "ombres": {
    "card": "0 6px 20px rgba(0, 0, 0, 0.10)"
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
