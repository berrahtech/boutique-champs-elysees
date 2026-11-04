import { afterNextRender, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Badge, Bouton, FcfaPipe, Icone } from '@lce/ui';
import { Cartes } from '../composants/cartes';
import { Catalogue, estEnPromotion, Produit } from '../donnees/catalogue';

/** Fin des promotions de la semaine : dimanche 23 h 59, heure de Bamako (UTC). */
function finDeSemaine(maintenant: Date): Date {
  const fin = new Date(maintenant);
  fin.setUTCDate(fin.getUTCDate() + ((7 - fin.getUTCDay()) % 7));
  fin.setUTCHours(23, 59, 59, 0);
  return fin;
}

@Component({
  selector: 'lce-accueil',
  imports: [FormsModule, RouterLink, Badge, Bouton, Cartes, FcfaPipe, Icone],
  templateUrl: './accueil.html',
  styleUrl: './accueil.scss',
})
export class Accueil {
  protected readonly catalogue = inject(Catalogue);

  protected readonly nouveautes = this.catalogue.nouveautes(4);
  protected readonly promotions = this.catalogue.promotions(4);
  protected readonly meilleuresVentes = this.catalogue.meilleuresVentes(4);
  protected readonly selectionBeaute = this.catalogue.deCategorie('parfums-cosmetiques', 3);
  protected readonly selectionMaison = [
    ...this.catalogue.deCategorie('electromenager', 2),
    ...this.catalogue.deCategorie('maison-decoration', 1),
  ];
  protected readonly populaires = this.catalogue
    .meilleuresVentes(16)
    .filter((p) => !this.meilleuresVentes.includes(p))
    .slice(0, 6);

  protected readonly prixSmartphones = this.catalogue.prixMinimum('Smartphones');
  protected readonly remiseMaxElectromenager = Math.max(
    ...this.catalogue
      .deCategorie('electromenager', 99)
      .filter(estEnPromotion)
      .map((p) => Math.round((1 - p.prix / p.prixBarre!) * 100)),
  );
  protected readonly remiseMax = Math.max(...this.promotions.map((p) => Math.round((1 - p.prix / p.prixBarre!) * 100)));
  protected readonly nbParCategorie = computed(() => this.catalogue.rechercher({}).parCategorie);

  private readonly maintenant = signal(new Date());
  protected readonly decompte = computed(() => {
    const reste = Math.max(0, finDeSemaine(this.maintenant()).getTime() - this.maintenant().getTime());
    const minutes = Math.floor(reste / 60_000);
    return { jours: Math.floor(minutes / 1440), heures: Math.floor((minutes % 1440) / 60), minutes: minutes % 60 };
  });

  protected email = '';
  protected readonly newsletter = signal<'saisie' | 'merci'>('saisie');

  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      const minuteur = setInterval(() => this.maintenant.set(new Date()), 30_000);
      destroy.onDestroy(() => clearInterval(minuteur));
    });
  }

  protected deuxChiffres(n: number): string {
    return String(n).padStart(2, '0');
  }

  protected infoMini(p: Produit): string {
    return p.rayon;
  }

  protected inscrireNewsletter(): void {
    // La newsletter n'a pas encore de service d'envoi : on confirme sans rien promettre de plus.
    if (this.email.includes('@')) this.newsletter.set('merci');
  }
}
