import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { Badge, Bouton, Etoiles, FcfaPipe, Icone, Quantite } from '@lce/ui';
import { ActionsProduit } from '../composants/actions-produit';
import { Cartes } from '../composants/cartes';
import { Catalogue, estEnPromotion } from '../donnees/catalogue';
import { Favoris } from '../etat/favoris';
import { Panier } from '../etat/panier';
import { titreDePage } from '../titres';

type Onglet = 'description' | 'caracteristiques' | 'avis';

/** Fiche produit (maquette « Produit »). */
@Component({
  selector: 'lce-produit',
  imports: [RouterLink, Badge, Bouton, Cartes, Etoiles, FcfaPipe, Icone, Quantite],
  templateUrl: './produit.html',
  styleUrl: './produit.scss',
})
export class FicheProduit {
  private readonly catalogue = inject(Catalogue);
  private readonly panier = inject(Panier);
  private readonly router = inject(Router);
  private readonly titre = inject(Title);
  private readonly meta = inject(Meta);
  protected readonly favoris = inject(Favoris);
  protected readonly actions = inject(ActionsProduit);

  readonly slug = input.required<string>();

  protected readonly produit = computed(() => this.catalogue.produit(this.slug()));
  protected readonly categorie = computed(() => {
    const p = this.produit();
    return p ? this.catalogue.categorie(p.categorie) : undefined;
  });
  protected readonly similaires = computed(() => {
    const p = this.produit();
    return p ? this.catalogue.similaires(p) : [];
  });
  protected readonly remise = computed(() => {
    const p = this.produit();
    return p && estEnPromotion(p) ? Math.round((1 - p.prix / p.prixBarre!) * 100) : 0;
  });
  /** Ce qu'on peut encore ajouter, compte tenu de ce qui est déjà au panier. */
  protected readonly maximum = computed(() => {
    const p = this.produit();
    return p ? Math.max(0, p.stock - this.panier.quantiteDe(p.id)) : 0;
  });

  protected readonly quantite = signal(1);
  protected readonly onglet = signal<Onglet>('description');
  protected readonly vue = signal(0);
  /** Vues de la galerie : sans photos, l'icône dorée sous plusieurs angles de présentation. */
  protected readonly vues = ['face', 'detail', 'emballage'] as const;

  constructor() {
    effect(() => {
      const p = this.produit();
      this.quantite.set(1);
      this.vue.set(0);
      this.onglet.set('description');
      this.titre.setTitle(titreDePage(p?.nom ?? 'Produit introuvable'));
      if (p) this.meta.updateTag({ name: 'description', content: p.description.slice(0, 160) });
    });
  }

  protected ajouter(): void {
    const p = this.produit();
    if (p) this.actions.ajouterAuPanier(p.id, this.quantite());
    this.quantite.set(1);
  }

  protected acheterMaintenant(): void {
    this.ajouter();
    void this.router.navigateByUrl('/panier');
  }

}
