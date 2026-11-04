import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Bouton, FcfaPipe, Icone, Quantite } from '@lce/ui';
import { ActionsProduit } from '../composants/actions-produit';
import { Favoris } from '../etat/favoris';
import { Notifications } from '../etat/notifications';
import { Panier } from '../etat/panier';
import { Session } from '../etat/session';

/** Zones et tarifs de la maquette « Panier » ; ils viendront de la table zone (lot 2). */
const ZONES = [
  { id: 'bamako', libelle: 'Bamako (Communes I à VI)', frais: 1500, delai: '24 à 48 h' },
  { id: 'peripherie', libelle: 'Kati, Kalaban Coro', frais: 3000, delai: '48 à 72 h' },
  { id: 'autres', libelle: 'Autres villes', frais: 5000, delai: '3 à 5 jours' },
];

/** Code de démonstration de la maquette ; la vérification réelle sera faite par l'API. */
const CODES: Record<string, number> = { BIENVENUE10: 10 };

@Component({
  selector: 'lce-panier',
  imports: [FormsModule, RouterLink, Bouton, FcfaPipe, Icone, Quantite],
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

  protected readonly zones = ZONES;
  protected readonly zoneId = signal(ZONES[0].id);
  protected readonly zone = computed(() => ZONES.find((z) => z.id === this.zoneId()) ?? ZONES[0]);

  protected saisieCode = '';
  protected readonly code = signal<string | null>(null);
  protected readonly erreurCode = signal<string | null>(null);

  protected readonly frais = computed(() => (this.panier.estVide() ? 0 : this.zone().frais));
  protected readonly remise = computed(() => {
    const code = this.code();
    return code ? Math.round((this.panier.sousTotal() * CODES[code]) / 100) : 0;
  });
  protected readonly total = computed(() => this.panier.sousTotal() + this.frais() - this.remise());
  protected readonly commandeAnnoncee = signal(false);

  protected appliquerCode(): void {
    const code = this.saisieCode.trim().toUpperCase();
    if (!code) return;
    if (code in CODES) {
      this.code.set(code);
      this.erreurCode.set(null);
    } else {
      this.code.set(null);
      this.erreurCode.set(`Le code « ${code} » n'est pas valable.`);
    }
  }

  protected retirerCode(): void {
    this.code.set(null);
    this.saisieCode = '';
  }

  protected retirer(id: string, nom: string): void {
    this.panier.retirer(id);
    this.notifications.afficher(`${nom} retiré du panier`);
  }

  protected mettreDeCote(id: string): void {
    if (!this.favoris.contient(id)) this.actions.basculerFavori(id);
    this.panier.retirer(id);
  }

  protected commander(): void {
    if (!this.session.connecte()) {
      void this.router.navigate(['/connexion'], { queryParams: { retour: '/panier' } });
      return;
    }
    this.commandeAnnoncee.set(true);
  }
}
