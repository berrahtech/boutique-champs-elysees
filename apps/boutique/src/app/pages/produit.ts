import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import type { DetailProduit } from '@lce/contrats';
import { API } from '@lce/session';
import { Badge, Bouton, Etoiles, FcfaPipe, Icone, NomIcone, Quantite } from '@lce/ui';
import { ActionsProduit } from '../composants/actions-produit';
import { Cartes } from '../composants/cartes';
import { ErreurChargement } from '../composants/etats';
import { remiseDe } from '../donnees/catalogue';
import { Favoris } from '../etat/favoris';
import { Panier } from '../etat/panier';
import { Recents } from '../etat/recents';
import { titreDePage } from '../titres';

type Onglet = 'description' | 'caracteristiques' | 'avis';

/** Fiche produit (maquette « Produit »). */
@Component({
  selector: 'lce-produit',
  imports: [RouterLink, Badge, Bouton, Cartes, ErreurChargement, Etoiles, FcfaPipe, Icone, Quantite],
  templateUrl: './produit.html',
  styleUrl: './produit.scss',
})
export class FicheProduit {
  private readonly panier = inject(Panier);
  private readonly recents = inject(Recents);
  private readonly router = inject(Router);
  private readonly titre = inject(Title);
  private readonly meta = inject(Meta);
  protected readonly favoris = inject(Favoris);
  protected readonly actions = inject(ActionsProduit);

  readonly slug = input.required<string>();

  protected readonly ressource = httpResource<DetailProduit>(() => `${API}/produits/${encodeURIComponent(this.slug())}`);
  private readonly detail = computed(() => (this.ressource.hasValue() ? this.ressource.value() : undefined));
  protected readonly produit = computed(() => this.detail()?.produit);
  protected readonly similaires = computed(() => this.detail()?.similaires ?? []);
  protected readonly introuvable = computed(() => {
    const e = this.ressource.error();
    return e instanceof HttpErrorResponse && e.status === 404;
  });
  protected readonly erreur = computed(() => this.ressource.status() === 'error' && !this.introuvable());

  protected readonly remise = computed(() => {
    const p = this.produit();
    return p ? remiseDe(p) : 0;
  });
  /** Ce qu'on peut encore ajouter, compte tenu de ce qui est déjà au panier. */
  protected readonly maximum = computed(() => {
    const p = this.produit();
    return p ? Math.max(0, p.stock - this.panier.quantiteDe(p.id)) : 0;
  });

  protected readonly quantite = signal(1);
  protected readonly onglet = signal<Onglet>('description');
  protected readonly vue = signal(0);
  /** Photos si le produit en a ; sinon l'icône dorée sous trois présentations, comme les maquettes. */
  protected readonly vues = computed(() => {
    const images = this.produit()?.images ?? [];
    return images.length ? images.map((_, i) => i) : [0, 1, 2];
  });
  protected readonly imageCourante = computed(() => this.produit()?.images[this.vue()] ?? null);

  constructor() {
    effect(() => {
      const p = this.produit();
      this.quantite.set(1);
      this.vue.set(0);
      this.onglet.set('description');
      if (p) {
        this.recents.noter(p.id);
        this.titre.setTitle(titreDePage(p.nom));
        this.meta.updateTag({ name: 'description', content: p.description.slice(0, 160) });
      } else if (this.introuvable()) {
        this.titre.setTitle(titreDePage('Produit introuvable'));
      }
    });
  }

  protected ico(nom: string | null): NomIcone {
    return (nom ?? 'sac') as NomIcone;
  }

  protected ajouter(): void {
    const p = this.produit();
    if (p) this.actions.ajouterAuPanier(p, this.quantite());
    this.quantite.set(1);
  }

  protected acheterMaintenant(): void {
    this.ajouter();
    void this.router.navigateByUrl('/panier');
  }
}
