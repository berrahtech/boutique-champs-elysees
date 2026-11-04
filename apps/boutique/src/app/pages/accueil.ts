import { httpResource } from '@angular/common/http';
import { afterNextRender, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Accueil as DonneesAccueil, ProduitPublic, ResultatsCatalogue } from '@lce/contrats';
import { API } from '@lce/session';
import { Bouton, FcfaPipe, Icone, NomIcone } from '@lce/ui';
import { Carrousel } from '../composants/carrousel';
import { Cartes } from '../composants/cartes';
import { ErreurChargement, Squelettes } from '../composants/etats';
import { Catalogue } from '../donnees/catalogue';
import { Recents } from '../etat/recents';

interface Banniere {
  titre: string;
  lien: string;
  image: string;
  /** Photo détourée sur fond blanc : elle se fond dans la bannière au lieu d'être encadrée. */
  fondue?: boolean;
  /** Catégorie dont la meilleure réduction s'affiche sur la bannière. */
  categorie: string;
}

const BANNIERES: Banniere[] = [
  {
    titre: 'Téléphones et ordinateurs',
    lien: '/categorie/telephones-informatique',
    image: '/bannieres/high-tech.webp',
    fondue: true,
    categorie: 'telephones-informatique',
  },
  {
    titre: 'Électroménager',
    lien: '/categorie/electromenager',
    image: '/bannieres/electromenager.webp',
    categorie: 'electromenager',
  },
  {
    titre: 'Parfums',
    lien: '/categorie/parfums-cosmetiques',
    image: '/bannieres/parfums.webp',
    categorie: 'parfums-cosmetiques',
  },
];

const DUREE_BANNIERE = 6000;

/** Vignette photo de chaque rayon (repli sur l'icône pour un nouveau rayon). */
const VIGNETTES = new Set(['mode', 'chaussures-accessoires', 'parfums-cosmetiques', 'electromenager', 'telephones-informatique', 'electronique', 'maison-decoration', 'divers']);

@Component({
  selector: 'lce-accueil',
  imports: [RouterLink, Bouton, Carrousel, Cartes, ErreurChargement, FcfaPipe, Icone, Squelettes],
  templateUrl: './accueil.html',
  styleUrl: './accueil.scss',
})
export class Accueil {
  protected readonly catalogue = inject(Catalogue);
  private readonly recents = inject(Recents);

  protected readonly donnees = httpResource<DonneesAccueil>(() => `${API}/accueil`);
  protected readonly a = computed(() => (this.donnees.hasValue() ? this.donnees.value() : undefined));
  protected readonly erreur = computed(() => this.donnees.status() === 'error');
  protected readonly recommandes = computed(() => this.a()?.promotions.slice(0, 2) ?? []);

  protected readonly bannieres = BANNIERES;
  protected readonly courante = signal(0);
  private enPause = false;

  /** Lu après le premier rendu : le serveur ne connaît pas l'historique de l'appareil. */
  private readonly idsRecents = signal<string[]>([]);
  private readonly ressourceRecents = httpResource<ResultatsCatalogue>(() => {
    const ids = this.idsRecents();
    return ids.length ? `${API}/produits?parPage=12&ids=${ids.join(',')}` : undefined;
  });
  protected readonly consultes = computed<ProduitPublic[]>(() => {
    if (!this.ressourceRecents.hasValue()) return [];
    const parId = new Map((this.ressourceRecents.value()?.produits ?? []).map((p) => [p.id, p]));
    return this.idsRecents().flatMap((id) => parId.get(id) ?? []);
  });

  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      this.idsRecents.set(this.recents.ids());
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const minuteur = setInterval(() => {
        if (!this.enPause && !document.hidden) this.avancer(1);
      }, DUREE_BANNIERE);
      destroy.onDestroy(() => clearInterval(minuteur));
    });
  }

  protected avancer(sens: 1 | -1): void {
    this.courante.update((i) => (i + sens + BANNIERES.length) % BANNIERES.length);
  }

  protected suspendre(pause: boolean): void {
    this.enPause = pause;
  }

  protected vignette(slug: string): string | null {
    return VIGNETTES.has(slug) ? `/bannieres/rayon-${slug}.webp` : null;
  }

  protected remise(categorie: string): number {
    return this.a()?.remisesParCategorie[categorie] ?? 0;
  }

  protected ico(nom: string | null): NomIcone {
    return (nom ?? 'sac') as NomIcone;
  }
}
