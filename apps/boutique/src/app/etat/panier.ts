import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { computed, effect, inject, Injectable, linkedSignal, PLATFORM_ID, signal, untracked } from '@angular/core';
import type { ApercuPanier, LignePanierDemandee, PanierEnregistre, ProduitPublic } from '@lce/contrats';
import { API, Session } from '@lce/session';
import { firstValueFrom } from 'rxjs';
import { signalPersistant } from './stockage-local';

const estListeDeLignes = (v: unknown): v is LignePanierDemandee[] =>
  Array.isArray(v) && v.every((l) => typeof l?.produitId === 'string' && Number.isInteger(l?.quantite) && l.quantite > 0);

const DELAI_ENREGISTREMENT_MS = 600;

/** Réunit deux paniers : chaque produit garde la plus grande des deux quantités. */
export function fusionnerPaniers(a: LignePanierDemandee[], b: LignePanierDemandee[]): LignePanierDemandee[] {
  const quantites = new Map<string, number>();
  for (const l of [...a, ...b]) quantites.set(l.produitId, Math.max(quantites.get(l.produitId) ?? 0, l.quantite));
  return [...quantites].map(([produitId, quantite]) => ({ produitId, quantite }));
}

/**
 * Panier : les lignes (produit, quantité) restent dans le navigateur pour fonctionner
 * sans compte et sur une connexion instable. Prix, stock et totaux viennent toujours
 * du serveur (POST /panier/apercu). Connecté, le panier suit le compte d'un appareil à l'autre.
 */
@Injectable({ providedIn: 'root' })
export class Panier {
  private readonly http = inject(HttpClient);
  private readonly session = inject(Session);
  private readonly navigateur = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly lignesBrutes = signalPersistant<LignePanierDemandee[]>('lce.panier.v2', [], estListeDeLignes);
  readonly zoneId = signal<string | null>(null);
  readonly codePromo = signal<string | null>(null);
  /** Articles retirés ou réduits par le serveur, à signaler au client. */
  readonly ajustements = signal<string[]>([]);

  private readonly ressource = httpResource<ApercuPanier>(() => {
    const lignes = this.lignesBrutes();
    if (!this.navigateur || !lignes.length) return undefined;
    return {
      url: `${API}/panier/apercu`,
      method: 'POST',
      body: { lignes, codePromo: this.codePromo(), ...(this.zoneId() ? { zoneId: this.zoneId() } : {}) },
    };
  });

  /** Dernier calcul connu : l'affichage ne clignote pas pendant que le suivant arrive. */
  readonly apercu = linkedSignal<ApercuPanier | undefined, ApercuPanier | undefined>({
    source: () => (this.ressource.hasValue() ? this.ressource.value() : undefined),
    computation: (valeur, precedent) => valeur ?? precedent?.value,
  });
  readonly chargement = computed(() => this.ressource.isLoading());
  readonly erreur = computed(() => this.ressource.status() === 'error');

  readonly nbArticles = computed(() => this.lignesBrutes().reduce((n, l) => n + l.quantite, 0));
  readonly estVide = computed(() => this.lignesBrutes().length === 0);

  private fusionFaite = signal(false);
  private minuteur?: ReturnType<typeof setTimeout>;

  constructor() {
    if (!this.navigateur) return;

    // Le serveur a réduit ou retiré des lignes : on aligne le panier local et on prévient.
    effect(() => {
      const apercu = this.ressource.hasValue() ? this.ressource.value() : undefined;
      if (!apercu) return;
      untracked(() => {
        if (apercu.ajustements.length) this.ajustements.set(apercu.ajustements);
        const serveur = apercu.lignes.map((l) => ({ produitId: l.produit.id, quantite: l.quantite }));
        const local = this.lignesBrutes();
        const identique =
          serveur.length === local.length &&
          local.every((l) => serveur.some((s) => s.produitId === l.produitId && s.quantite === l.quantite));
        if (!identique && apercu.ajustements.length) this.lignesBrutes.set(serveur);
      });
    });

    // Connexion : on réunit le panier de l'appareil et celui du compte. Déconnexion : on efface.
    effect(() => {
      const connecte = this.session.connecte();
      untracked(() => {
        if (connecte) void this.fusionner();
        else if (this.fusionFaite()) {
          this.fusionFaite.set(false);
          this.vider();
        }
      });
    });

    // Connecté : chaque changement est enregistré sur le compte, groupé par courtes rafales.
    effect(() => {
      const lignes = this.lignesBrutes();
      const code = this.codePromo();
      if (!this.fusionFaite()) return;
      clearTimeout(this.minuteur);
      this.minuteur = setTimeout(() => {
        // Hors connexion, l'envoi échoue sans gêne : le prochain changement renverra tout.
        this.http.put(`${API}/panier`, { lignes, codePromo: code }).subscribe({ error: () => undefined });
      }, DELAI_ENREGISTREMENT_MS);
    });
  }

  quantiteDe(produitId: string): number {
    return this.lignesBrutes().find((l) => l.produitId === produitId)?.quantite ?? 0;
  }

  /** Ajoute au panier ; renvoie la quantité réellement ajoutée (limitée par le stock connu). */
  ajouter(produit: ProduitPublic, quantite = 1): number {
    if (produit.stock === 0) return 0;
    const actuelle = this.quantiteDe(produit.id);
    const cible = Math.min(produit.stock, actuelle + quantite);
    if (cible !== actuelle) this.changerQuantite(produit.id, cible);
    return cible - actuelle;
  }

  changerQuantite(produitId: string, quantite: number): void {
    this.ajustements.set([]);
    this.lignesBrutes.update((lignes) => {
      if (quantite <= 0) return lignes.filter((l) => l.produitId !== produitId);
      return lignes.some((l) => l.produitId === produitId)
        ? lignes.map((l) => (l.produitId === produitId ? { ...l, quantite } : l))
        : [...lignes, { produitId, quantite }];
    });
  }

  retirer(produitId: string): void {
    this.changerQuantite(produitId, 0);
  }

  vider(): void {
    this.lignesBrutes.set([]);
    this.codePromo.set(null);
    this.ajustements.set([]);
  }

  /** Relance le calcul après une erreur réseau. */
  recharger(): void {
    this.ressource.reload();
  }

  private async fusionner(): Promise<void> {
    try {
      const compte = await firstValueFrom(this.http.get<PanierEnregistre>(`${API}/panier`));
      this.lignesBrutes.update((local) => fusionnerPaniers(local, compte.lignes));
      if (compte.codePromo && !this.codePromo()) this.codePromo.set(compte.codePromo);
    } catch {
      // Compte injoignable : le panier local continue de fonctionner.
    }
    this.fusionFaite.set(true);
  }
}
