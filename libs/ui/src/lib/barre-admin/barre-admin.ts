import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icone } from '../icone/icone';

/** Barre supérieure de l'administration : recherche, utilisateur, déconnexion. */
@Component({
  selector: 'lce-barre-admin',
  imports: [Icone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <form class="recherche" role="search" (submit)="$event.preventDefault(); rechercher.emit(champ.value.trim())">
        <label for="lce-recherche-admin" class="lce-visuellement-masque">Rechercher un produit</label>
        <lce-icone nom="recherche" [taille]="20" />
        <input id="lce-recherche-admin" #champ type="search" placeholder="Rechercher un produit…" />
      </form>

      <div class="utilisateur">
        <span class="initiales" aria-hidden="true">{{ initiales() }}</span>
        <span>
          <strong>{{ nomUtilisateur() }}</strong><br />
          <small>{{ role() }}</small>
        </span>
        <button type="button" class="deconnexion" aria-label="Se déconnecter" (click)="deconnecter.emit()">
          <lce-icone nom="deconnexion" [taille]="20" />
        </button>
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
    .deconnexion {
      display: grid;
      place-items: center;
      width: var(--lce-cible-tactile);
      height: var(--lce-cible-tactile);
      border: 0;
      background: none;
      color: var(--lce-ink-muted);
      cursor: pointer;
    }
    .deconnexion:hover {
      color: var(--lce-danger);
    }
    .utilisateur {
      margin-left: auto;
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
  readonly rechercher = output<string>();
  readonly deconnecter = output<void>();

  protected initiales(): string {
    return this.nomUtilisateur()
      .split(/\s+/)
      .map((mot) => mot[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
