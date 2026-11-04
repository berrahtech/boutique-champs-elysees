import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

const API = '/api/v1';
const CLE_RAFRAICHISSEMENT = 'lce.session.v1';

export type ObjetCode = 'INSCRIPTION' | 'CONNEXION' | 'MOT_DE_PASSE';

export interface Profil {
  id: string;
  nom: string;
  telephone: string;
  email: string | null;
  role: string;
  permissions: string[];
}

interface PaireJetons {
  jetonAcces: string;
  jetonRafraichissement: string;
  expireDans: number;
}

/** Erreur de l'API (RFC 9457) ramenée à ce dont l'interface a besoin. */
export class ErreurApi extends Error {
  constructor(
    /** Dernier segment du type : « otp-invalide », « compte-existant »… */
    readonly code: string,
    message: string,
    readonly details: { erreurs?: string[]; essaisRestants?: number; reessayerDansSecondes?: number } = {},
  ) {
    super(message);
  }

  /** Texte à montrer à l'utilisateur, en français et actionnable. */
  get messageUtilisateur(): string {
    switch (this.code) {
      case 'otp-invalide':
        return `Code incorrect. Il vous reste ${this.details.essaisRestants} essai${this.details.essaisRestants === 1 ? '' : 's'}.`;
      case 'otp-expire':
        return 'Ce code a expiré ou a déjà servi. Demandez un nouveau code.';
      case 'trop-de-tentatives':
        return `Trop de tentatives. Réessayez dans ${Math.ceil((this.details.reessayerDansSecondes ?? 60) / 60)} minute(s).`;
      case 'compte-existant':
        return 'Un compte existe déjà avec ce numéro. Connectez-vous ou choisissez « Mot de passe oublié ».';
      case 'identifiants-invalides':
        return 'Numéro ou mot de passe incorrect.';
      case 'compte-inactif':
        return 'Ce compte est désactivé. Contactez le service client.';
      case 'donnees-invalides':
        return this.details.erreurs?.join(' ') ?? this.message;
      case 'reseau':
        return 'Connexion impossible au serveur. Vérifiez votre connexion internet puis réessayez.';
      default:
        return this.message || 'Une erreur est survenue. Réessayez dans un instant.';
    }
  }
}

/**
 * Session de la personne connectée. Le jeton d'accès (15 min) reste en mémoire ;
 * le jeton de rafraîchissement (30 jours) est gardé dans le navigateur pour rester
 * connecté. À terme, il passera dans un cookie httpOnly posé par l'API.
 */
@Injectable({ providedIn: 'root' })
export class Session {
  private readonly http = inject(HttpClient);
  private readonly navigateur = isPlatformBrowser(inject(PLATFORM_ID));
  private jetonAcces: string | null = null;

  readonly profil = signal<Profil | null>(null);
  readonly connecte = computed(() => this.profil() !== null);
  readonly prenom = computed(() => this.profil()?.nom.split(/\s+/)[0] ?? null);
  /** true tant que la reprise de session au démarrage n'est pas terminée. */
  readonly enCours = signal(false);

  /** Reprend la session enregistrée, sans bloquer l'affichage. */
  async reprendre(): Promise<void> {
    const jeton = this.lireRafraichissement();
    if (!jeton) return;
    this.enCours.set(true);
    try {
      await this.ouvrir(await this.appel<PaireJetons>('auth/rafraichir', { jetonRafraichissement: jeton }));
    } catch {
      this.oublier();
    } finally {
      this.enCours.set(false);
    }
  }

  demanderCode(telephone: string, objet: ObjetCode): Promise<unknown> {
    return this.appel('auth/otp', { telephone, objet });
  }

  async verifierCode(telephone: string, objet: ObjetCode, code: string): Promise<string> {
    return (await this.appel<{ preuveOtp: string }>('auth/otp/verifier', { telephone, objet, code })).preuveOtp;
  }

  async inscrire(preuveOtp: string, nom: string, motDePasse: string, email?: string): Promise<void> {
    await this.ouvrir(await this.appel<PaireJetons>('auth/inscription', { preuveOtp, nom, motDePasse, ...(email ? { email } : {}) }));
  }

  /** Lève ErreurApi « otp-requis » si le compte a la double authentification : redemander avec `code`. */
  async connecter(telephone: string, motDePasse: string, code?: string): Promise<void> {
    await this.ouvrir(await this.appel<PaireJetons>('auth/connexion', { telephone, motDePasse, ...(code ? { code } : {}) }));
  }

  reinitialiserMotDePasse(preuveOtp: string, motDePasse: string): Promise<unknown> {
    return this.appel('auth/mot-de-passe/reinitialiser', { preuveOtp, motDePasse });
  }

  async deconnecter(): Promise<void> {
    const jeton = this.lireRafraichissement();
    this.oublier();
    if (jeton) await this.appel('auth/deconnexion', { jetonRafraichissement: jeton }).catch(() => undefined);
  }

  private async ouvrir(paire: PaireJetons): Promise<void> {
    this.jetonAcces = paire.jetonAcces;
    if (this.navigateur) {
      try {
        localStorage.setItem(CLE_RAFRAICHISSEMENT, paire.jetonRafraichissement);
      } catch {
        // Stockage bloqué : la session durera le temps de l'onglet.
      }
    }
    const profil = await firstValueFrom(
      this.http.get<Profil>(`${API}/moi`, { headers: new HttpHeaders({ Authorization: `Bearer ${this.jetonAcces}` }) }),
    );
    this.profil.set(profil);
  }

  private oublier(): void {
    this.jetonAcces = null;
    this.profil.set(null);
    if (this.navigateur) {
      try {
        localStorage.removeItem(CLE_RAFRAICHISSEMENT);
      } catch {
        // Rien à faire.
      }
    }
  }

  private lireRafraichissement(): string | null {
    if (!this.navigateur) return null;
    try {
      return localStorage.getItem(CLE_RAFRAICHISSEMENT);
    } catch {
      return null;
    }
  }

  private async appel<T>(chemin: string, corps: object): Promise<T> {
    try {
      return await firstValueFrom(this.http.post<T>(`${API}/${chemin}`, corps));
    } catch (e) {
      throw versErreurApi(e);
    }
  }
}

export function versErreurApi(e: unknown): ErreurApi {
  if (e instanceof ErreurApi) return e;
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0 || e.status >= 502) return new ErreurApi('reseau', 'Serveur injoignable');
    const corps = (e.error ?? {}) as { type?: string; title?: string; erreurs?: string[]; essaisRestants?: number; reessayerDansSecondes?: number };
    const code = corps.type?.split('/').pop() ?? 'inconnue';
    return new ErreurApi(code, corps.title ?? e.message, corps);
  }
  return new ErreurApi('inconnue', 'Erreur inattendue');
}
