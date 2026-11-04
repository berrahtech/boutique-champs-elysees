import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Bouton, Icone } from '@lce/ui';
import { Cartes } from '../composants/cartes';
import { Catalogue, Produit } from '../donnees/catalogue';
import { Favoris } from '../etat/favoris';

/** Favoris (maquette « Favoris »), conservés sur l'appareil. */
@Component({
  selector: 'lce-favoris',
  imports: [RouterLink, Bouton, Cartes, Icone],
  template: `
    <div class="lce-conteneur page">
      <nav class="fil" aria-label="Fil d'Ariane"><a routerLink="/">Accueil</a><lce-icone nom="chevron-droite" [taille]="14" /><span aria-current="page">Mes favoris</span></nav>
      <div class="empile">
        <h1 class="titre-1">Mes favoris</h1>
        <span class="attenue">{{ produits().length }} produit{{ produits().length > 1 ? 's' : '' }} mis de côté</span>
      </div>
      @if (produits().length) {
        <lce-cartes [produits]="produits()" />
      } @else {
        <div class="a-venir panneau-ivoire">
          <lce-icone nom="favoris" [taille]="48" />
          <h2 class="titre-3">Aucun favori pour l'instant</h2>
          <p class="attenue">Touchez le cœur d'un produit pour le retrouver ici.</p>
          <a lceBouton variante="nuit" routerLink="/boutique">Découvrir la boutique</a>
        </div>
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
      color: var(--lce-gold-deep);
    }
  `,
})
export class PageFavoris {
  private readonly catalogue = inject(Catalogue);
  private readonly favoris = inject(Favoris);

  protected readonly produits = computed(() =>
    this.favoris
      .liste()
      .map((id) => this.catalogue.parId(id))
      .filter((p): p is Produit => !!p),
  );
}
