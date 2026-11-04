import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ResultatsCatalogue } from '@lce/contrats';
import { API } from '@lce/session';
import { Bouton, Icone } from '@lce/ui';
import { Cartes } from '../composants/cartes';
import { ErreurChargement, Squelettes } from '../composants/etats';
import { Favoris } from '../etat/favoris';

/** Favoris (maquette « Favoris »). */
@Component({
  selector: 'lce-favoris',
  imports: [RouterLink, Bouton, Cartes, ErreurChargement, Icone, Squelettes],
  template: `
    <div class="lce-conteneur page">
      <nav class="fil" aria-label="Fil d'Ariane"><a routerLink="/">Accueil</a><lce-icone nom="chevron-droite" [taille]="14" /><span aria-current="page">Mes favoris</span></nav>
      <div class="empile">
        <h1 class="titre-1">Mes favoris</h1>
        <span class="attenue">{{ favoris.nombre() }} produit{{ favoris.nombre() > 1 ? 's' : '' }} mis de côté</span>
      </div>
      @if (favoris.nombre() === 0) {
        <div class="a-venir panneau-ivoire">
          <lce-icone nom="favoris" [taille]="48" />
          <h2 class="titre-3">Aucun favori pour l'instant</h2>
          <p class="attenue">Touchez le cœur d'un produit pour le retrouver ici.</p>
          <a lceBouton variante="primaire" routerLink="/boutique">Découvrir la boutique</a>
        </div>
      } @else if (produits(); as liste) {
        <lce-cartes [produits]="liste" />
      } @else if (ressource.status() === 'error') {
        <lce-erreur-chargement (reessayer)="ressource.reload()" />
      } @else {
        <lce-squelettes [nombre]="favoris.nombre()" />
      }
    </div>
  `,
  styles: `
    .page {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding-block: 24px 64px;
    }
    .a-venir lce-icone {
      color: var(--lce-navy);
    }
  `,
})
export class PageFavoris {
  protected readonly favoris = inject(Favoris);

  protected readonly ressource = httpResource<ResultatsCatalogue>(() => {
    const ids = this.favoris.liste();
    return ids.length ? { url: `${API}/produits`, params: { ids: ids.join(','), parPage: 48 } } : undefined;
  });
  protected readonly produits = computed(() => {
    if (!this.ressource.hasValue()) return undefined;
    // Le catalogue renvoie les produits dans son ordre : on garde celui des favoris.
    const produits = this.ressource.value()?.produits ?? [];
    return this.favoris.liste().flatMap((id) => produits.filter((p) => p.id === id));
  });
}
