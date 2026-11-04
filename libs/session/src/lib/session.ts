import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { catchError, firstValueFrom, from, switchMap, throwError } from 'rxjs';

export const API = '/api/v1';
const CLE_RAFRAICHISSEMENT = 'lce.session.v1';

export type ObjetCode = 'INSCRIPTION' | 'CONNEXION' | 'MOT_DE_PASSE';

export interface Profil {
  id: string;
  nom: string;
  telephone: string | null;
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
    readonly details: { erreurs?: string[]; essaisRestants?: number; reessayerDansSecondes?: number; detail?: string } = {},
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
        return 'Un compte existe déjà avec cet identifiant. Connectez-vous ou choisissez « Mot de passe oublié ».';
      case 'identifiants-invalides':
        return 'Identifiant ou mot de passe incorrect.';
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

export function versErreurApi(e: unknown): ErreurApi {
  if (e instanceof ErreurApi) return e;
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0 || e.status >= 502) return new ErreurApi('reseau', 'Serveur injoignable');
    const corps = (e.error ?? {}) as ErreurApi['details'] & { type?: string; title?: string };
    return new ErreurApi(corps.type?.split('/').pop() ?? 'inconnue', corps.title ?? e.message, corps);
  }
  return new ErreurApi('inconnue', 'Erreur inattendue');
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
  private renouvellement: Promise<string | null> | null = null;

  readonly profil = signal<Profil | null>(null);
  readonly connecte = computed(() => this.profil() !== null);
  readonly prenom = computed(() => this.profil()?.nom.split(/\s+/)[0] ?? null);
  readonly permissions = computed<ReadonlySet<string>>(() => new Set(this.profil()?.permissions ?? []));
  /** true tant que la reprise de session au démarrage n'est pas terminée. */
  readonly enCours = signal(false);
  /** true une fois la reprise terminée, connecté ou non. */
  readonly pret = signal(false);

  get jeton(): string | null {
    return this.jetonAcces;
  }

  /** Reprend la session enregistrée, sans bloquer l'affichage. */
  async reprendre(): Promise<void> {
    if (!this.lireRafraichissement()) {
      this.pret.set(true);
      return;
    }
    this.enCours.set(true);
    try {
      await this.renouveler();
    } finally {
      this.enCours.set(false);
      this.pret.set(true);
    }
  }

  /**
   * Échange le jeton de rafraîchissement ; un seul échange à la fois, sinon la rotation
   * prendrait le 2e appel pour un vol et fermerait toutes les sessions. Le verrou du
   * navigateur protège aussi contre plusieurs onglets ouverts en même temps.
   */
  renouveler(): Promise<string | null> {
    this.renouvellement ??= this.sousVerrou(async () => {
      const jeton = this.lireRafraichissement();
      if (!jeton) return null;
      try {
        await this.ouvrir(await this.appel<PaireJetons>('auth/rafraichir', { jetonRafraichissement: jeton }));
        return this.jetonAcces;
      } catch (e) {
        // Serveur injoignable : on garde le jeton pour réessayer. Sinon il n'est plus valable.
        if (versErreurApi(e).code !== 'reseau') this.oublier();
        return null;
      }
    }).finally(() => (this.renouvellement = null));
    return this.renouvellement;
  }

  demanderCode(identifiant: string, objet: ObjetCode): Promise<unknown> {
    return this.appel('auth/otp', { identifiant, objet });
  }

  async verifierCode(identifiant: string, objet: ObjetCode, code: string): Promise<string> {
    return (await this.appel<{ preuveOtp: string }>('auth/otp/verifier', { identifiant, objet, code })).preuveOtp;
  }

  async inscrire(preuveOtp: string, nom: string, motDePasse: string, email?: string): Promise<void> {
    await this.ouvrir(await this.appel<PaireJetons>('auth/inscription', { preuveOtp, nom, motDePasse, ...(email ? { email } : {}) }));
  }

  /** Lève ErreurApi « otp-requis » si le compte a la double authentification : redemander avec `code`. */
  async connecter(identifiant: string, motDePasse: string, code?: string): Promise<void> {
    await this.ouvrir(await this.appel<PaireJetons>('auth/connexion', { identifiant, motDePasse, ...(code ? { code } : {}) }));
  }

  /** Connexion ou inscription avec le jeton d'identité reçu du bouton Google. */
  async connecterAvecGoogle(jeton: string): Promise<void> {
    await this.ouvrir(await this.appel<PaireJetons>('auth/google', { jeton }));
  }

  reinitialiserMotDePasse(preuveOtp: string, motDePasse: string): Promise<unknown> {
    return this.appel('auth/mot-de-passe/reinitialiser', { preuveOtp, motDePasse });
  }

  async deconnecter(): Promise<void> {
    const jeton = this.lireRafraichissement();
    this.oublier();
    if (jeton) await this.appel('auth/deconnexion', { jetonRafraichissement: jeton }).catch(() => undefined);
  }

  /** Oublie la session localement (jeton refusé par le serveur). */
  oublier(): void {
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

  private async ouvrir(paire: PaireJetons): Promise<void> {
    this.jetonAcces = paire.jetonAcces;
    if (this.navigateur) {
      try {
        localStorage.setItem(CLE_RAFRAICHISSEMENT, paire.jetonRafraichissement);
      } catch {
        // Stockage bloqué : la session durera le temps de l'onglet.
      }
    }
    this.profil.set(await firstValueFrom(this.http.get<Profil>(`${API}/moi`)));
  }

  private sousVerrou<T>(action: () => Promise<T>): Promise<T> {
    return this.navigateur && navigator.locks ? navigator.locks.request('lce.session', action) : action();
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

/**
 * Ajoute le jeton aux appels de l'API. Sur un 401 (jeton expiré au bout de 15 min),
 * renouvelle la session une fois et rejoue la requête, sans que l'utilisateur le voie.
 */
export const intercepteurSession: HttpInterceptorFn = (requete, suivant) => {
  if (!requete.url.startsWith(API) || requete.url.startsWith(`${API}/auth/`)) return suivant(requete);
  const session = inject(Session);
  const avecJeton = (jeton: string | null) =>
    jeton ? requete.clone({ setHeaders: { Authorization: `Bearer ${jeton}` } }) : requete;

  return suivant(avecJeton(session.jeton)).pipe(
    catchError((e: unknown) => {
      const rejouable = e instanceof HttpErrorResponse && e.status === 401 && session.jeton !== null && !requete.url.endsWith('/moi');
      if (!rejouable) return throwError(() => e);
      return from(session.renouveler()).pipe(
        switchMap((jeton) => (jeton ? suivant(avecJeton(jeton)) : throwError(() => e))),
      );
    }),
  );
};
