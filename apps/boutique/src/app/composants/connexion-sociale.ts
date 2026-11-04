import { isPlatformBrowser } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, output, PLATFORM_ID, viewChild } from '@angular/core';
import { API } from '@lce/session';
import { Notifications } from '../etat/notifications';

interface OptionsConnexion {
  googleClientId: string | null;
}

interface GoogleIdentite {
  accounts: {
    id: {
      initialize(options: { client_id: string; callback: (reponse: { credential: string }) => void }): void;
      renderButton(cible: HTMLElement, options: Record<string, unknown>): void;
    };
  };
}

const SCRIPT_GOOGLE = 'https://accounts.google.com/gsi/client';

/**
 * Boutons Google et Facebook sous le formulaire. Google n'est actif que si l'API a un
 * identifiant client (son script n'est chargé qu'alors) ; Facebook n'a pas encore de
 * service côté API. Un bouton inactif le dit au clic au lieu de ne rien faire.
 */
@Component({
  selector: 'lce-connexion-sociale',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="separateur"><span></span>Ou<span></span></div>
    @if (clientId()) {
      <div class="cible" #cible></div>
    } @else {
      <button type="button" class="bouton google" (click)="indisponible('Google')">
        <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.600-.2-2.300H12v4.500h6.500a5.500 5.500 0 0 1-2.400 3.600v3h3.900c2.300-2.100 3.500-5.200 3.500-8.800z" />
          <path fill="#34A853" d="M12 24c3.200 0 6-1.100 8-2.900l-3.900-3c-1.100.7-2.500 1.200-4.100 1.200-3.100 0-5.800-2.100-6.700-5H1.300v3.100A12 12 0 0 0 12 24z" />
          <path fill="#FBBC05" d="M5.300 14.300a7.200 7.200 0 0 1 0-4.600V6.600h-4a12 12 0 0 0 0 10.800z" />
          <path fill="#EA4335" d="M12 4.800c1.800 0 3.300.6 4.600 1.800l3.400-3.400A12 12 0 0 0 1.300 6.600l4 3.100c.9-2.800 3.600-4.900 6.700-4.900z" />
        </svg>
        {{ action() }} avec Google
      </button>
    }
    <button type="button" class="bouton facebook" (click)="indisponible('Facebook')">
      <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
        <circle cx="12" cy="12" r="12" fill="#FFFFFF" />
        <path fill="#166FE5" d="M16.700 15.500l.5-3.500h-3.300V9.800c0-1 .5-1.900 2-1.900h1.500v-3s-1.400-.2-2.700-.2c-2.700 0-4.500 1.700-4.500 4.600V12h-3v3.500h3V24h3.700v-8.500z" />
      </svg>
      {{ action() }} avec Facebook
    </button>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .separateur {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--lce-ink-muted);
      font-size: 20px;
      line-height: 26px;
    }
    .separateur span {
      flex: 1;
      height: 1px;
      background: var(--lce-line-fort);
    }
    .cible {
      display: flex;
      justify-content: center;
      min-height: 44px;
    }
    .bouton {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      width: 100%;
      height: 72px;
      border-radius: 14px;
      font: 500 20px/26px var(--lce-police-texte);
      cursor: pointer;
    }
    .google {
      border: 2px solid var(--lce-line-fort);
      background: var(--lce-surface);
      color: var(--lce-noir);
    }
    .google:hover {
      background: var(--lce-surface-douce);
    }
    .facebook {
      border: 0;
      background: var(--lce-facebook);
      color: var(--lce-on-navy);
    }
    .facebook:hover {
      filter: brightness(0.92);
    }
    @media (max-width: 960px) {
      .bouton {
        height: 56px;
        font-size: 16px;
      }
      .bouton svg {
        width: 24px;
        height: 24px;
      }
    }
  `,
})
export class ConnexionSociale {
  private readonly navigateur = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly notifications = inject(Notifications);
  private readonly cible = viewChild<ElementRef<HTMLElement>>('cible');
  private readonly options = httpResource<OptionsConnexion>(() => `${API}/auth/options`);

  protected readonly clientId = computed(() => (this.options.hasValue() ? this.options.value()?.googleClientId : null) ?? null);

  /** Début du libellé : « Se connecter » ou « S'inscrire ». */
  readonly action = input.required<string>();
  /** Jeton d'identité signé par Google, à faire vérifier par l'API. */
  readonly jeton = output<string>();

  constructor() {
    effect(() => {
      const clientId = this.clientId();
      const cible = this.cible()?.nativeElement;
      if (clientId && cible && this.navigateur) void this.afficher(clientId, cible);
    });
  }

  protected indisponible(fournisseur: string): void {
    this.notifications.afficher(`La connexion ${fournisseur} sera bientôt disponible.`);
  }

  private async afficher(clientId: string, cible: HTMLElement): Promise<void> {
    await chargerScript();
    const google = (window as unknown as { google?: GoogleIdentite }).google;
    if (!google) return;
    google.accounts.id.initialize({ client_id: clientId, callback: (r) => this.jeton.emit(r.credential) });
    google.accounts.id.renderButton(cible, { theme: 'outline', size: 'large', text: 'continue_with', locale: 'fr', width: 400 });
  }
}

let chargement: Promise<void> | null = null;

function chargerScript(): Promise<void> {
  chargement ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_GOOGLE;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Script Google indisponible'));
    document.head.appendChild(script);
  });
  // Bloqueur de publicité ou réseau coupé : on laisse simplement les autres moyens de connexion.
  return chargement.catch(() => undefined);
}
