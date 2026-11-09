import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Session } from '@lce/session';
import { BarreAdmin, MenuAdmin, SECTIONS_ADMIN, SectionAdmin } from '@lce/ui';
import { filter } from 'rxjs';
import { EtatStocks } from './etat-stocks';

/**
 * Mise en page de l'administration : menu selon les permissions, barre supérieure, contenu.
 * Sur tablette et mobile, le menu devient un tiroir refermé à chaque navigation.
 */
@Component({
  selector: 'lce-coquille',
  imports: [RouterOutlet, BarreAdmin, MenuAdmin],
  host: { '(document:keydown.escape)': 'menuOuvert.set(false)' },
  template: `
    <aside [class.ouvert]="menuOuvert()">
      <lce-menu-admin [sections]="sections()" [permissions]="session.permissions()" />
    </aside>
    @if (menuOuvert()) {
      <div class="voile" aria-hidden="true" (click)="menuOuvert.set(false)"></div>
    }
    <div class="contenu">
      <lce-barre-admin
        [nomUtilisateur]="session.profil()?.nom ?? ''"
        [role]="session.profil()?.role ?? ''"
        (menu)="menuOuvert.set(true)"
        (deconnecter)="deconnecter()"
        (rechercher)="rechercher($event)"
      />
      <main>
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: 264px minmax(0, 1fr);
      min-height: 100vh;
    }
    aside {
      position: sticky;
      top: 0;
      height: 100vh;
    }
    .contenu {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    lce-barre-admin {
      position: sticky;
      top: 0;
      z-index: 20;
    }
    @media (max-width: 1024px) {
      :host {
        grid-template-columns: minmax(0, 1fr);
      }
      aside {
        position: fixed;
        z-index: 40;
        inset: 0 auto 0 0;
        width: min(288px, 86vw);
        box-shadow: 0 0 48px rgb(0 0 0 / 30%);
        transform: translateX(-105%);
        transition: transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      aside.ouvert {
        transform: none;
      }
      .voile {
        position: fixed;
        z-index: 30;
        inset: 0;
        background: rgb(17 19 21 / 45%);
        animation: apparition 200ms ease both;
      }
    }
    @keyframes apparition {
      from {
        opacity: 0;
      }
    }
  `,
})
export class Coquille {
  protected readonly session = inject(Session);
  private readonly router = inject(Router);
  private readonly stocks = inject(EtatStocks);

  protected readonly menuOuvert = signal(false);

  protected readonly sections = computed<SectionAdmin[]>(() => {
    const alertes = this.stocks.alertes();
    return SECTIONS_ADMIN.map((s) => ({
      ...s,
      rubriques: s.rubriques.map((r) => (r.lien === '/admin/stocks' ? { ...r, pastille: { nombre: alertes, niveau: 'alerte' as const } } : r)),
    }));
  });

  constructor() {
    const abonnement = this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.menuOuvert.set(false));
    inject(DestroyRef).onDestroy(() => abonnement.unsubscribe());
  }

  protected async deconnecter(): Promise<void> {
    await this.session.deconnecter();
    await this.router.navigateByUrl('/admin/connexion');
  }

  protected rechercher(q: string): void {
    void this.router.navigate(['/admin/produits'], { queryParams: { q: q || null } });
  }
}
