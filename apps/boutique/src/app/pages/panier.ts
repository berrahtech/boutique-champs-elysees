import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { ProduitPublic, ZonePublique } from '@lce/contrats';
import { API, Session } from '@lce/session';
import { Bouton, FcfaPipe, Icone, NomIcone, Quantite } from '@lce/ui';
import { ActionsProduit } from '../composants/actions-produit';
import { ErreurChargement, Squelettes } from '../composants/etats';
import { Favoris } from '../etat/favoris';
import { Notifications } from '../etat/notifications';
import { Panier } from '../etat/panier';

/** 48 h → « 24 à 48 h » ; au-delà de 3 jours, en jours. */
export function libelleDelai(heures: number): string {
  if (heures <= 72) return `${heures - 24} à ${heures} h`;
  const jours = Math.ceil(heures / 24);
  return `${jours - 2} à ${jours} jours`;
}

/** Panier (maquette « Panier ») : les montants affichés sont ceux calculés par le serveur. */
@Component({
  selector: 'lce-panier',
  imports: [ErreurChargement, Squelettes, FormsModule, RouterLink, Bouton, FcfaPipe, Icone, Quantite],
  templateUrl: './panier.html',
  styleUrl: './panier.scss',
})
export class PagePanier {
  protected readonly panier = inject(Panier);
  protected readonly session = inject(Session);
  private readonly favoris = inject(Favoris);
  private readonly notifications = inject(Notifications);
  private readonly actions = inject(ActionsProduit);
  private readonly router = inject(Router);

  private readonly ressourceZones = httpResource<ZonePublique[]>(() => `${API}/zones`);
  protected readonly zones = computed(() => (this.ressourceZones.hasValue() ? this.ressourceZones.value() : []));
  protected readonly zone = computed<ZonePublique | undefined>(() => {
    const id = this.panier.zoneId();
    return this.zones().find((z) => z.id === id) ?? this.zones()[0];
  });
  protected readonly delai = computed(() => {
    const z = this.zone();
    return z ? libelleDelai(z.delaiHeures) : '';
  });

  protected saisieCode = this.panier.codePromo() ?? '';
  protected readonly apercu = this.panier.apercu;
  protected readonly commandeAnnoncee = signal(false);

  protected ico(nom: string | null): NomIcone {
    return (nom ?? 'sac') as NomIcone;
  }

  protected appliquerCode(): void {
    this.panier.codePromo.set(this.saisieCode.trim().toUpperCase() || null);
  }

  protected retirerCode(): void {
    this.panier.codePromo.set(null);
    this.saisieCode = '';
  }

  protected retirer(produit: ProduitPublic): void {
    this.panier.retirer(produit.id);
    this.notifications.afficher(`${produit.nom} retiré du panier`);
  }

  protected mettreDeCote(produit: ProduitPublic): void {
    if (!this.favoris.contient(produit.id)) this.actions.basculerFavori(produit);
    this.panier.retirer(produit.id);
  }

  protected commander(): void {
    if (!this.session.connecte()) {
      void this.router.navigate(['/connexion'], { queryParams: { retour: '/panier' } });
      return;
    }
    this.commandeAnnoncee.set(true);
  }
}
