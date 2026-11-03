import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { Bascule } from '../bascule/bascule';
import { Icone } from '../icone/icone';

/** Barre supérieure de l'administration : recherche globale, état de la boutique, notifications, utilisateur. */
@Component({
  selector: 'lce-barre-admin',
  imports: [Bascule, Icone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <form class="recherche" role="search" (submit)="$event.preventDefault(); rechercher.emit(champ.value.trim())">
        <label for="lce-recherche-admin" class="lce-visuellement-masque">Rechercher une commande, un client, un produit</label>
        <lce-icone nom="recherche" [taille]="20" />
        <input id="lce-recherche-admin" #champ type="search" placeholder="Commande, client, produit…" />
      </form>

      <lce-bascule [(active)]="boutiqueOuverte" [libelle]="boutiqueOuverte() ? 'Boutique ouverte' : 'Boutique fermée'" />

      <button
        type="button"
        class="notifications"
        [attr.aria-label]="'Notifications, ' + nbNotifications() + ' non lue(s)'"
        (click)="ouvrirNotifications.emit()"
      >
        <lce-icone nom="notification" />
        @if (nbNotifications() > 0) {
          <span class="compteur" aria-hidden="true">{{ nbNotifications() }}</span>
        }
      </button>

      <div class="utilisateur">
        <span class="initiales" aria-hidden="true">{{ initiales() }}</span>
        <span>
          <strong>{{ nomUtilisateur() }}</strong><br />
          <small>{{ role() }}</small>
        </span>
      </div>
    </header>
  `,
  styles: `
    @use 'typographie' as t;

    header {
      display: flex;
      align-items: center;
      gap: var(--lce-espace-5);
      min-height: 64px;
      padding-inline: var(--lce-espace-6);
      background: var(--lce-surface);
      border-bottom: 1px solid var(--lce-line);
    }
    .recherche {
      flex: 1;
      max-width: 480px;
      display: flex;
      align-items: center;
      gap: var(--lce-espace-2);
      padding-inline: var(--lce-espace-3);
      border: 1px solid var(--lce-line);
      border-radius: var(--lce-rayon-controle);
      color: var(--lce-ink-muted);
    }
    .recherche input {
      @include t.texte-body;
      flex: 1;
      height: 40px;
      border: 0;
      background: transparent;
      color: var(--lce-ink);
    }
    lce-bascule {
      margin-left: auto;
    }
    .notifications {
      position: relative;
      display: grid;
      place-items: center;
      width: var(--lce-cible-tactile);
      height: var(--lce-cible-tactile);
      border: 0;
      background: none;
      color: var(--lce-navy);
      cursor: pointer;
    }
    .compteur {
      position: absolute;
      top: 4px;
      right: 2px;
      min-width: 18px;
      border-radius: var(--lce-rayon-pastille);
      background: var(--lce-danger);
      color: var(--lce-on-navy);
      font-size: 11px;
      font-weight: 700;
      line-height: 18px;
      text-align: center;
    }
    .utilisateur {
      @include t.texte-small;
      display: flex;
      align-items: center;
      gap: var(--lce-espace-2);
    }
    .initiales {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--lce-gold-soft);
      color: var(--lce-gold-text);
      font-weight: 700;
    }
    small {
      color: var(--lce-ink-muted);
    }
  `,
})
export class BarreAdmin {
  readonly nomUtilisateur = input.required<string>();
  readonly role = input.required<string>();
  readonly nbNotifications = input(0);
  readonly boutiqueOuverte = model(true);
  readonly rechercher = output<string>();
  readonly ouvrirNotifications = output<void>();

  protected initiales(): string {
    return this.nomUtilisateur()
      .split(/\s+/)
      .map((mot) => mot[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
