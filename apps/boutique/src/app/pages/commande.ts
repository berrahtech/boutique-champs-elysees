import { HttpClient, httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { CommandeClient, CreationCommande, MoyenPaiement, PreremplissageCommande, ZonePublique } from '@lce/contrats';
import { API, Session, versErreurApi } from '@lce/session';
import { Bouton, FcfaPipe, Icone, NomIcone } from '@lce/ui';
import { firstValueFrom } from 'rxjs';
import { Panier } from '../etat/panier';
import { libelleDelai } from './panier';

interface Moyen {
  id: MoyenPaiement;
  libelle: string;
  detail: string;
  icone: NomIcone;
  disponible: boolean;
}

const MOYENS: Moyen[] = [
  { id: 'A_LA_LIVRAISON', libelle: 'Paiement à la livraison', detail: 'En espèces ou par Mobile Money, au livreur', icone: 'especes', disponible: true },
  { id: 'ORANGE_MONEY', libelle: 'Orange Money', detail: 'Bientôt disponible', icone: 'mobile', disponible: false },
  { id: 'MOOV_MONEY', libelle: 'Moov Money', detail: 'Bientôt disponible', icone: 'mobile', disponible: false },
];

/** Validation de la commande : adresse de livraison, paiement, récapitulatif. */
@Component({
  selector: 'lce-commande',
  imports: [FormsModule, RouterLink, Bouton, FcfaPipe, Icone],
  templateUrl: './commande.html',
  styleUrl: './commande.scss',
})
export class PageCommande {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  protected readonly session = inject(Session);
  protected readonly panier = inject(Panier);

  private readonly ressourceZones = httpResource<ZonePublique[]>(() => `${API}/zones`);
  protected readonly zones = computed(() => (this.ressourceZones.hasValue() ? this.ressourceZones.value() : []));
  private readonly ressourcePreremplissage = httpResource<PreremplissageCommande>(() => (this.session.connecte() ? `${API}/commandes/preremplissage` : undefined));

  protected readonly apercu = this.panier.apercu;
  protected readonly moyens = MOYENS;
  protected readonly zone = computed(() => this.zones().find((z) => z.id === this.panier.zoneId()) ?? this.zones()[0]);

  protected nom = '';
  protected telephone = '';
  protected quartier = '';
  protected repere = '';
  protected note = '';
  protected readonly moyen = signal<MoyenPaiement>('A_LA_LIVRAISON');
  protected readonly envoi = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly tentee = signal(false);

  constructor() {
    // Sans connexion, on passe par la page de connexion qui ramène ici.
    effect(() => {
      if (this.session.pret() && !this.session.connecte()) {
        void this.router.navigate(['/connexion'], { queryParams: { retour: '/commande' }, replaceUrl: true });
      }
    });
    // La dernière adresse utilisée remplit le formulaire, sans écraser une saisie en cours.
    effect(() => {
      const p = this.ressourcePreremplissage.hasValue() ? this.ressourcePreremplissage.value() : undefined;
      if (!p) return;
      untracked(() => {
        this.nom ||= p.nom;
        this.telephone ||= p.telephone.replace(/^\+223/, '');
        this.quartier ||= p.quartier;
        this.repere ||= p.repere;
        if (p.zoneId && !this.panier.zoneId()) this.panier.zoneId.set(p.zoneId);
      });
    });
  }

  protected ico(nom: string | null): NomIcone {
    return (nom ?? 'sac') as NomIcone;
  }

  protected delai(z: ZonePublique | undefined): string {
    return z ? `Livraison en ${libelleDelai(z.delaiHeures)}` : '';
  }

  protected champManquant(valeur: string, min = 2): boolean {
    return this.tentee() && valeur.trim().length < min;
  }

  protected async confirmer(): Promise<void> {
    this.tentee.set(true);
    const zone = this.zone();
    if (!zone || this.nom.trim().length < 2 || this.telephone.trim().length < 8 || this.quartier.trim().length < 2 || this.repere.trim().length < 3) {
      this.erreur.set('Complétez les informations de livraison.');
      return;
    }
    const corps: CreationCommande = {
      lignes: this.panier.lignes(),
      codePromo: this.panier.codePromo(),
      zoneId: zone.id,
      adresse: { nom: this.nom, telephone: this.telephone, quartier: this.quartier, repere: this.repere },
      note: this.note || null,
      moyen: this.moyen(),
    };
    this.erreur.set(null);
    this.envoi.set(true);
    try {
      const commande = await firstValueFrom(this.http.post<CommandeClient>(`${API}/commandes`, corps));
      this.panier.vider();
      await this.router.navigate(['/compte/commandes', commande.numero], { queryParams: { nouvelle: 1 }, replaceUrl: true });
    } catch (e) {
      const api = versErreurApi(e);
      this.erreur.set(api.details.detail ? `${api.messageUtilisateur}. ${api.details.detail}` : api.messageUtilisateur);
      // Stock ou prix changés : le récapitulatif se recalcule pour montrer la réalité.
      if (api.code === 'panier-modifie' || api.code === 'stock-insuffisant' || api.code === 'code-refuse') this.panier.recharger();
    } finally {
      this.envoi.set(false);
    }
  }
}
