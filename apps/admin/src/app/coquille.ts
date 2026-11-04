import { Component, computed, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Session } from '@lce/session';
import { BarreAdmin, MenuAdmin, SECTIONS_ADMIN, SectionAdmin } from '@lce/ui';
import { EtatStocks } from './etat-stocks';

/** Mise en page de l'administration : menu selon les permissions, barre supérieure, contenu. */
@Component({
  selector: 'lce-coquille',
  imports: [RouterOutlet, BarreAdmin, MenuAdmin],
  template: `
    <lce-menu-admin [sections]="sections()" [permissions]="session.permissions()" />
    <div class="contenu">
      <lce-barre-admin [nomUtilisateur]="session.profil()?.nom ?? ''" [role]="session.profil()?.role ?? ''" (deconnecter)="deconnecter()" (rechercher)="rechercher($event)" />
      <main>
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: 248px minmax(0, 1fr);
      min-height: 100vh;
    }
    .contenu {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    @media (max-width: 860px) {
      :host {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class Coquille {
  protected readonly session = inject(Session);
  private readonly router = inject(Router);

  private readonly stocks = inject(EtatStocks);

  protected readonly sections = computed<SectionAdmin[]>(() => {
    const alertes = this.stocks.alertes();
    return SECTIONS_ADMIN.map((s) => ({
      ...s,
      rubriques: s.rubriques.map((r) => (r.lien === '/admin/stocks' ? { ...r, pastille: { nombre: alertes, niveau: 'alerte' as const } } : r)),
    }));
  });

  protected async deconnecter(): Promise<void> {
    await this.session.deconnecter();
    await this.router.navigateByUrl('/admin/connexion');
  }

  protected rechercher(q: string): void {
    void this.router.navigate(['/admin/produits'], { queryParams: { q: q || null } });
  }
}
