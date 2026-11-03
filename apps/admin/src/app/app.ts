import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BarreAdmin, MenuAdmin, SECTIONS_ADMIN, SectionAdmin } from '@lce/ui';

@Component({
  selector: 'lce-root',
  imports: [RouterOutlet, BarreAdmin, MenuAdmin],
  template: `
    <lce-menu-admin [sections]="sections" [permissions]="permissions()" />
    <div class="contenu">
      <lce-barre-admin nomUtilisateur="Aminata Diallo" role="Administrateur" [nbNotifications]="3" />
      <main>
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: 260px 1fr;
      min-height: 100vh;
      background: var(--lce-adm-bg);
    }
    .contenu {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    main {
      flex: 1;
      padding: var(--lce-espace-6);
    }
  `,
})
export class App {
  // Provisoire : les permissions viendront du jeton de l'utilisateur connecté.
  protected readonly permissions = signal<ReadonlySet<string>>(
    new Set(SECTIONS_ADMIN.flatMap((s) => s.rubriques.map((r) => r.permission))),
  );

  // Exemple de pastilles : or = à traiter, rouge = alerte.
  protected readonly sections: SectionAdmin[] = SECTIONS_ADMIN.map((section) => ({
    ...section,
    rubriques: section.rubriques.map((r) =>
      r.lien === '/admin/commandes'
        ? { ...r, pastille: { nombre: 12, niveau: 'a-traiter' as const } }
        : r.lien === '/admin/stocks'
          ? { ...r, pastille: { nombre: 3, niveau: 'alerte' as const } }
          : r,
    ),
  }));
}
