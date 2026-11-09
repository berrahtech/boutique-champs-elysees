import { ChangeDetectionStrategy, Component, computed, ElementRef, input, output, viewChild } from '@angular/core';
import { Icone } from '../icone/icone';

/** Barre supérieure de l'administration : menu (mobile), recherche, utilisateur, déconnexion. */
@Component({
  selector: 'lce-barre-admin',
  imports: [Icone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'raccourci($event)' },
  template: `
    <header>
      <button type="button" class="icone-bouton menu" aria-label="Ouvrir le menu" (click)="menu.emit()">
        <lce-icone nom="menu" [taille]="22" />
      </button>
      <form class="recherche" role="search" (submit)="$event.preventDefault(); rechercher.emit(champ.value.trim())">
        <label for="lce-recherche-admin" class="lce-visuellement-masque">Rechercher un produit</label>
        <lce-icone nom="recherche" [taille]="18" />
        <input id="lce-recherche-admin" #champ type="search" placeholder="Rechercher un produit…" />
        <kbd aria-hidden="true">/</kbd>
      </form>
      <div class="utilisateur">
        <span class="initiales" aria-hidden="true">{{ initiales() }}</span>
        <span class="identite">
          <strong>{{ nomUtilisateur() }}</strong>
          <small>{{ role() }}</small>
        </span>
        <button type="button" class="icone-bouton deconnexion" aria-label="Se déconnecter" title="Se déconnecter" (click)="deconnecter.emit()">
          <lce-icone nom="deconnexion" [taille]="20" />
        </button>
      </div>
    </header>
  `,
  styles: `
    header {
      display: flex;
      align-items: center;
      gap: 16px;
      height: 68px;
      padding-inline: 32px;
      border-bottom: 1px solid rgb(25 28 31 / 7%);
      background: rgb(255 255 255 / 86%);
      backdrop-filter: saturate(1.6) blur(14px);
    }
    .icone-bouton {
      display: grid;
      place-items: center;
      flex: none;
      width: 40px;
      height: 40px;
      border: 0;
      border-radius: 10px;
      background: transparent;
      color: var(--lce-ink-muted);
      cursor: pointer;
      transition:
        background-color 150ms,
        color 150ms;
    }
    .icone-bouton:hover {
      background: var(--lce-neutre-soft);
      color: var(--lce-ink);
    }
    .menu {
      display: none;
      margin-left: -8px;
      color: var(--lce-ink);
    }
    .recherche {
      flex: 1;
      max-width: 520px;
      display: flex;
      align-items: center;
      gap: 10px;
      height: 44px;
      padding-inline: 16px 8px;
      border: 1px solid transparent;
      border-radius: var(--lce-rayon-pastille);
      background: var(--lce-adm-bg);
      color: var(--lce-ink-muted);
      transition:
        background-color 150ms,
        border-color 150ms,
        box-shadow 150ms;
    }
    .recherche:focus-within {
      border-color: var(--lce-navy-500);
      background: var(--lce-surface);
      box-shadow: 0 0 0 4px rgb(11 94 199 / 12%);
    }
    .recherche input {
      flex: 1;
      min-width: 0;
      height: 100%;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--lce-ink);
      font: 400 14px/20px var(--lce-police-texte);
    }
    kbd {
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      border: 1px solid var(--lce-line);
      border-radius: 7px;
      background: var(--lce-surface);
      color: var(--lce-ink-muted);
      font: 700 12px/1 var(--lce-police-texte);
    }
    .recherche:focus-within kbd {
      visibility: hidden;
    }
    .utilisateur {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-left: auto;
      padding-left: 16px;
      border-left: 1px solid var(--lce-line);
    }
    .initiales {
      display: grid;
      place-items: center;
      flex: none;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: var(--lce-gold);
      color: var(--lce-on-gold);
      font: 800 13px/1 var(--lce-police-texte);
    }
    .identite {
      display: flex;
      flex-direction: column;
      font-size: 14px;
      line-height: 18px;
    }
    small {
      color: var(--lce-ink-muted);
      font-size: 12px;
      line-height: 16px;
    }
    .deconnexion:hover {
      background: var(--lce-danger-soft);
      color: var(--lce-danger);
    }
    @media (max-width: 1024px) {
      header {
        padding-inline: 16px;
      }
      .menu {
        display: grid;
      }
    }
    @media (max-width: 640px) {
      header {
        gap: 8px;
      }
      .identite,
      kbd {
        display: none;
      }
      .utilisateur {
        padding-left: 4px;
        border-left: 0;
      }
    }
  `,
})
export class BarreAdmin {
  readonly nomUtilisateur = input.required<string>();
  readonly role = input.required<string>();
  readonly rechercher = output<string>();
  readonly deconnecter = output<void>();
  /** Bouton menu, affiché sur tablette et mobile. */
  readonly menu = output<void>();

  private readonly champ = viewChild.required<ElementRef<HTMLInputElement>>('champ');

  protected readonly initiales = computed(() =>
    this.nomUtilisateur()
      .split(/\s+/)
      .map((mot) => mot[0])
      .slice(0, 2)
      .join('')
      .toUpperCase(),
  );

  /** « / » place le curseur dans la recherche, sauf pendant une saisie. */
  protected raccourci(e: KeyboardEvent): void {
    const cible = e.target as HTMLElement | null;
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (cible?.closest('input, textarea, select, [contenteditable="true"]')) return;
    e.preventDefault();
    this.champ().nativeElement.focus();
  }
}
