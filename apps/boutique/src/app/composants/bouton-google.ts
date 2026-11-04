import { isPlatformBrowser } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, output, PLATFORM_ID, viewChild } from '@angular/core';
import { API } from '@lce/session';

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
 * Bouton « Continuer avec Google ». Masqué tant que l'API n'a pas d'identifiant client :
 * le script de Google n'est alors même pas chargé.
 */
@Component({
  selector: 'lce-bouton-google',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (clientId()) {
      <div class="cible" #cible></div>
      <div class="separateur petit attenue"><span></span>ou<span></span></div>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    .cible {
      display: flex;
      justify-content: center;
      min-height: 44px;
    }
    .separateur {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .separateur span {
      flex: 1;
      height: 1px;
      background: var(--lce-line);
    }
  `,
})
export class BoutonGoogle {
  private readonly navigateur = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly cible = viewChild<ElementRef<HTMLElement>>('cible');
  private readonly options = httpResource<OptionsConnexion>(() => `${API}/auth/options`);

  protected readonly clientId = computed(() => (this.options.hasValue() ? this.options.value()?.googleClientId : null) ?? null);

  /** Jeton d'identité signé par Google, à faire vérifier par l'API. */
  readonly jeton = output<string>();

  constructor() {
    effect(() => {
      const clientId = this.clientId();
      const cible = this.cible()?.nativeElement;
      if (clientId && cible && this.navigateur) void this.afficher(clientId, cible);
    });
  }

  private async afficher(clientId: string, cible: HTMLElement): Promise<void> {
    await chargerScript();
    const google = (window as unknown as { google?: GoogleIdentite }).google;
    if (!google) return;
    google.accounts.id.initialize({ client_id: clientId, callback: (r) => this.jeton.emit(r.credential) });
    google.accounts.id.renderButton(cible, { theme: 'outline', size: 'large', text: 'continue_with', locale: 'fr', width: 320 });
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
