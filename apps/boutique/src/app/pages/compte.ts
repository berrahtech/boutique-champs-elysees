import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Bouton, Icone, MenuClient } from '@lce/ui';
import { Favoris } from '../etat/favoris';
import { Notifications } from '../etat/notifications';
import { Panier } from '../etat/panier';
import { Session } from '@lce/session';

/** Espace client (maquette « Compte »). Les rubriques détaillées arrivent avec les commandes. */
@Component({
  selector: 'lce-compte',
  imports: [RouterLink, Bouton, Icone, MenuClient],
  template: `
    <div class="lce-conteneur page">
      @if (session.profil(); as profil) {
        <nav class="fil" aria-label="Fil d'Ariane"><a routerLink="/">Accueil</a><lce-icone nom="chevron-droite" [taille]="14" /><span aria-current="page">Mon compte</span></nav>
        <div class="disposition">
          <lce-menu-client (deconnecter)="deconnecter()" />
          <div class="contenu">
            <h1 class="titre-1">Bonjour {{ session.prenom() }}</h1>
            <div class="grille-3 tuiles">
              <a class="tuile panneau" routerLink="/compte/commandes"><lce-icone nom="colis" [taille]="28" /><b>Commandes</b></a>
              <a class="tuile panneau" routerLink="/panier"><lce-icone nom="panier" [taille]="28" /><b>Panier ({{ panier.nbArticles() }})</b></a>
              <a class="tuile panneau" routerLink="/favoris"><lce-icone nom="favoris" [taille]="28" /><b>Favoris ({{ favoris.nombre() }})</b></a>
            </div>
            <section class="panneau infos" aria-labelledby="infos-titre">
              <h2 id="infos-titre" class="titre-3">Mes informations</h2>
              <dl>
                <dt>Nom</dt><dd>{{ profil.nom }}</dd>
                <dt>Téléphone</dt><dd>{{ profil.telephone ?? 'Non renseigné' }}</dd>
                <dt>E-mail</dt><dd>{{ profil.email ?? 'Non renseigné' }}</dd>
              </dl>
            </section>
          </div>
        </div>
      } @else if (session.enCours()) {
        <p class="attente" role="status">Chargement de votre compte…</p>
      } @else {
        <div class="a-venir">
          <lce-icone nom="compte" [taille]="48" />
          <h1 class="titre-2">Mon compte</h1>
          <a lceBouton variante="primaire" routerLink="/connexion" [queryParams]="{ retour: '/compte' }">Se connecter</a>
          <a class="lien" routerLink="/inscription">Créer un compte</a>
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
    .disposition {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 32px;
    }
    lce-menu-client {
      flex: 1 1 260px;
      max-width: 300px;
    }
    .contenu {
      flex: 999 1 560px;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .tuile {
      display: flex;
      flex-direction: column;
      gap: 6px;
      color: var(--lce-ink);
      text-decoration: none;
    }
    .tuile:hover {
      border-color: var(--lce-navy);
    }
    .tuile lce-icone {
      color: var(--lce-navy);
    }
    dl {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 12px 32px;
      margin: 16px 0 0;
    }
    dt {
      color: var(--lce-ink-muted);
    }
    dd {
      margin: 0;
      font-weight: 600;
    }
    .attente {
      padding: 72px 0;
      text-align: center;
    }
    @media (max-width: 860px) {
      lce-menu-client {
        max-width: none;
      }
    }
  `,
})
export class Compte {
  protected readonly session = inject(Session);
  protected readonly panier = inject(Panier);
  protected readonly favoris = inject(Favoris);
  private readonly router = inject(Router);
  private readonly notifications = inject(Notifications);

  protected async deconnecter(): Promise<void> {
    await this.session.deconnecter();
    this.notifications.afficher('Vous êtes déconnecté.');
    await this.router.navigateByUrl('/');
  }
}
