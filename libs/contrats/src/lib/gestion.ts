import type { CommandeClient, CommandeResume, ModeEncaissement, MoyenPaiement, StatutCommande } from './commandes';

// ——— Commandes ———

/** Actions possibles sur une commande, selon son statut et les droits de la personne. */
export type ActionCommande = 'preparer' | 'prete' | 'affecter' | 'expedier' | 'livrer' | 'echec' | 'relivrer' | 'retour' | 'annuler';

export interface CommandeAdmin extends CommandeResume {
  client: { id: string; nom: string; telephone: string | null };
  zone: string;
  livreur: string | null;
}

export interface ListeCommandesAdmin {
  commandes: CommandeAdmin[];
  total: number;
  page: number;
  pages: number;
  /** Nombre de commandes par statut, pour les onglets. */
  compteurs: Partial<Record<StatutCommande, number>>;
}

export interface MissionAdmin {
  id: string;
  statut: 'PROPOSEE' | 'ACCEPTEE' | 'REFUSEE' | 'EN_COURS' | 'LIVREE' | 'ECHEC' | 'RETOUR';
  livreur: { id: string; nom: string; telephone: string | null };
  affecteeLe: string;
  livreeLe: string | null;
  motif: string | null;
}

export interface CommandeAdminDetail extends CommandeClient {
  zoneId: string;
  client: { id: string; nom: string; telephone: string | null; email: string | null };
  mission: MissionAdmin | null;
  encaissement: { montant: number; mode: ModeEncaissement; statut: StatutCaisse; encaisseLe: string } | null;
  actions: ActionCommande[];
}

export interface EcritureActionCommande {
  action: ActionCommande;
  /** Obligatoire pour annuler et pour un échec de livraison. */
  motif?: string;
  /** Pour « affecter ». */
  livreurId?: string;
  /** Pour « livrer » une commande payée à la livraison. */
  mode?: ModeEncaissement;
}

// ——— Livreurs et caisse ———

export type StatutCaisse = 'A_REVERSER' | 'EN_ATTENTE_VALIDATION' | 'REVERSE';

export interface LivreurAdmin {
  id: string;
  nom: string;
  telephone: string | null;
  actif: boolean;
  disponible: boolean;
  zones: { id: string; nom: string }[];
  /** Missions affectées ou en cours. */
  enCours: number;
  livrees: number;
  /** Argent encaissé, pas encore remis à la boutique. */
  aReverser: number;
}

export interface EcritureLivreur {
  nom: string;
  telephone: string;
  zoneIds: string[];
  disponible?: boolean;
  actif?: boolean;
}

export interface EncaissementAdmin {
  id: string;
  commande: string;
  montant: number;
  mode: ModeEncaissement;
  statut: StatutCaisse;
  encaisseLe: string;
}

export interface ReversementAdmin {
  id: string;
  livreur: string;
  montant: number;
  statut: StatutCaisse;
  declareLe: string;
  valideePar: string | null;
}

export interface CaisseLivreur {
  livreur: LivreurAdmin;
  encaissements: EncaissementAdmin[];
  reversements: ReversementAdmin[];
}

// ——— Zones ———

export interface ZoneAdmin {
  id: string;
  nom: string;
  frais: number;
  delaiHeures: number;
  seuilGratuit: number | null;
  actif: boolean;
  livreurs: number;
  commandes: number;
}

export interface EcritureZone {
  nom: string;
  frais: number;
  delaiHeures: number;
  seuilGratuit: number | null;
  actif: boolean;
}

// ——— Marketing ———

export type TypeRemise = 'POURCENTAGE' | 'MONTANT_FIXE' | 'LIVRAISON_OFFERTE';

export interface CodePromoAdmin {
  id: string;
  code: string;
  type: TypeRemise;
  valeur: number;
  categorie: { id: string; nom: string } | null;
  montantMinimum: number;
  debut: string;
  fin: string;
  utilisationsMax: number | null;
  utilisations: number;
  actif: boolean;
  /** Calculé : actif, dans sa période et pas épuisé. */
  etat: 'actif' | 'programme' | 'expire' | 'epuise' | 'desactive';
}

export interface EcritureCodePromo {
  code: string;
  type: TypeRemise;
  valeur: number;
  categorieId: string | null;
  montantMinimum: number;
  debut: string;
  fin: string;
  utilisationsMax: number | null;
  actif: boolean;
}

// ——— Personnel et rôles ———

export interface MembrePersonnel {
  id: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  role: { id: string; nom: string };
  actif: boolean;
  creeLe: string;
}

export interface EcritureMembre {
  nom: string;
  telephone: string;
  email?: string | null;
  roleId: string;
  /** Obligatoire à la création seulement. */
  motDePasse?: string;
  actif?: boolean;
}

export interface PermissionVue {
  code: string;
  libelle: string;
  module: string;
}

export interface RoleAdmin {
  id: string;
  nom: string;
  systeme: boolean;
  /** Rôle réservé (Client, Livreur, Administrateur) : ses permissions ne se modifient pas ici. */
  verrouille: boolean;
  permissions: string[];
  membres: number;
}

export interface VuePersonnel {
  membres: MembrePersonnel[];
  roles: RoleAdmin[];
  permissions: PermissionVue[];
}

export interface EcritureRole {
  nom: string;
  permissions: string[];
}

// ——— Clients ———

export interface ClientAdmin {
  id: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  actif: boolean;
  creeLe: string;
  commandes: number;
  /** Total des commandes livrées. */
  depense: number;
  derniereCommande: string | null;
}

export interface ListeClientsAdmin {
  clients: ClientAdmin[];
  total: number;
  page: number;
  pages: number;
}

export interface ClientAdminDetail extends ClientAdmin {
  historique: CommandeResume[];
  adresses: { libelle: string; zone: string; quartier: string; repere: string }[];
}

// ——— Finances ———

export interface PointSerie {
  /** Jour (AAAA-MM-JJ) ou mois (AAAA-MM). */
  periode: string;
  chiffre: number;
  commandes: number;
}

export interface RapportFinances {
  debut: string;
  fin: string;
  /** Total des commandes livrées sur la période. */
  chiffreAffaires: number;
  commandesLivrees: number;
  panierMoyen: number;
  commandesPassees: number;
  commandesAnnulees: number;
  remises: number;
  fraisLivraison: number;
  /** Argent encaissé par les livreurs et pas encore remis. */
  aReverser: number;
  serie: PointSerie[];
  parMoyen: { moyen: MoyenPaiement; chiffre: number; commandes: number }[];
  parZone: { zone: string; chiffre: number; commandes: number }[];
  meilleursProduits: { produitId: string; libelle: string; quantite: number; chiffre: number }[];
}

// ——— Tableau de bord ———

export interface ResumeVentes {
  aTraiter: number;
  enLivraison: number;
  chiffreDuJour: number;
  commandesDuJour: number;
  dernieres: CommandeAdmin[];
}
