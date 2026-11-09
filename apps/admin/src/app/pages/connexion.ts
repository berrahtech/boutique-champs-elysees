import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { normaliserIdentifiant, Session, versErreurApi } from '@lce/session';
import { Bouton, Icone } from '@lce/ui';

/** Connexion du personnel en 2 étapes (maquette « A-Connexion »). */
@Component({
  selector: 'lce-connexion',
  imports: [FormsModule, Bouton, Icone],
  template: `
    <section class="presentation">
      <div class="marque"><img src="/logo-lce.png" alt="" width="56" height="56" /><span>Les Champs Élysées<small>Administration</small></span></div>
      <div class="accroche">
        <h1>Toute la boutique, <em>en un coup d'œil.</em></h1>
        <ul>
          <li><span><lce-icone nom="produits" [taille]="20" /></span>Catalogue, prix et photos</li>
          <li><span><lce-icone nom="stock" [taille]="20" /></span>Stocks et alertes en temps réel</li>
          <li><span><lce-icone nom="securite" [taille]="20" /></span>Accès protégé en deux étapes</li>
        </ul>
      </div>
      <span class="discret">Accès réservé au personnel. Toutes les connexions sont enregistrées.</span>
    </section>

    <section class="droite">
      <form (ngSubmit)="valider()" novalidate>
        @if (etape() === 'identifiants') {
          <div class="tete">
            <h2>Connexion</h2>
            <p>Avec votre numéro ou votre adresse professionnelle.</p>
          </div>
          <div class="champ">
            <label for="identifiant">Téléphone ou e-mail</label>
            <input id="identifiant" name="identifiant" class="saisie" autocomplete="username" placeholder="70 00 00 00 ou nom@leschampselysees.ml" [(ngModel)]="identifiant" />
          </div>
          <div class="champ">
            <label for="mdp">Mot de passe</label>
            <span class="avec-bouton">
              <input id="mdp" name="mdp" class="saisie" [type]="mdpVisible() ? 'text' : 'password'" autocomplete="current-password" placeholder="Votre mot de passe" [(ngModel)]="motDePasse" />
              <button type="button" class="oeil" [attr.aria-label]="mdpVisible() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'" [attr.aria-pressed]="mdpVisible()" (click)="mdpVisible.set(!mdpVisible())">
                <lce-icone [nom]="mdpVisible() ? 'masquer' : 'voir'" [taille]="20" />
              </button>
            </span>
          </div>
        } @else {
          <span class="cadenas"><lce-icone nom="cadenas" [taille]="26" /></span>
          <div class="tete">
            <h2>Vérification</h2>
            <p>Saisissez le code à 6 chiffres reçu par SMS et par e-mail. Il est valable 5 minutes.</p>
          </div>
          <div class="champ">
            <label for="code">Code de vérification</label>
            <input id="code" name="code" class="saisie code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" [(ngModel)]="code" />
          </div>
        }
        @if (erreur()) {
          <p class="erreur" role="alert"><lce-icone nom="alerte" [taille]="18" />{{ erreur() }}</p>
        }
        <button lceBouton type="submit" class="envoyer" [pleineLargeur]="true" [disabled]="envoi()">
          @if (envoi()) {
            <span class="rouage" aria-hidden="true"></span>Vérification…
          } @else {
            {{ etape() === 'identifiants' ? 'Continuer' : 'Se connecter' }}<lce-icone nom="fleche-droite" [taille]="18" />
          }
        </button>
        @if (etape() === 'code') {
          <button type="button" class="retour" (click)="revenir()"><lce-icone nom="chevron-gauche" [taille]="16" />Modifier mes identifiants</button>
        } @else {
          <span class="note">Après 5 tentatives incorrectes, le compte est bloqué 15 minutes.</span>
        }
      </form>
    </section>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      min-height: 100vh;
      background: var(--lce-surface);
    }
    .presentation {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 40px;
      overflow: hidden;
      padding: 48px 64px;
      background: var(--lce-navy);
      color: var(--lce-on-navy);
      isolation: isolate;
    }
    // Disque doré et anneau, comme la bannière de la boutique.
    .presentation::before {
      content: '';
      position: absolute;
      z-index: -1;
      right: -180px;
      bottom: -200px;
      width: 520px;
      aspect-ratio: 1;
      border-radius: 50%;
      background: var(--lce-gold);
    }
    .presentation::after {
      content: '';
      position: absolute;
      z-index: -1;
      top: 90px;
      right: 70px;
      width: 120px;
      aspect-ratio: 1;
      border: 2px solid rgb(255 255 255 / 16%);
      border-radius: 50%;
    }
    .marque {
      display: flex;
      align-items: center;
      gap: 14px;
      font: 800 20px/24px var(--lce-police-titre);
    }
    .marque img {
      object-fit: contain;
    }
    .marque small {
      display: block;
      margin-top: 2px;
      color: var(--lce-gold);
      font: 700 11px/14px var(--lce-police-texte);
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .accroche {
      display: flex;
      flex-direction: column;
      gap: 32px;
      max-width: 480px;
    }
    h1 {
      margin: 0;
      font: 800 46px/54px var(--lce-police-titre);
      letter-spacing: -0.02em;
    }
    h1 em {
      display: block;
      color: var(--lce-gold);
      font-style: normal;
    }
    ul {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      align-items: center;
      gap: 14px;
      color: rgb(255 255 255 / 86%);
      font: 500 16px/22px var(--lce-police-texte);
    }
    li span {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgb(255 255 255 / 8%);
      color: var(--lce-gold);
    }
    .discret {
      max-width: 300px;
      color: rgb(255 255 255 / 50%);
      font-size: 13px;
      line-height: 20px;
    }

    .droite {
      display: grid;
      place-items: center;
      padding: 48px 24px;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: min(100%, 420px);
      animation: adm-entree 320ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }
    .tete h2 {
      margin: 0 0 6px;
      font: 800 34px/42px var(--lce-police-titre);
      letter-spacing: -0.01em;
    }
    .tete p {
      margin: 0;
      color: var(--lce-ink-muted);
      font-size: 15px;
      line-height: 22px;
    }
    .saisie {
      height: 52px;
    }
    .avec-bouton {
      position: relative;
    }
    .avec-bouton .saisie {
      padding-right: 52px;
    }
    .oeil {
      position: absolute;
      top: 6px;
      right: 6px;
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--lce-ink-muted);
      cursor: pointer;
    }
    .oeil:hover {
      color: var(--lce-ink);
    }
    .cadenas {
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: var(--lce-gold-soft);
      color: var(--lce-gold-text);
    }
    .code {
      height: 64px;
      font: 800 28px/1 var(--lce-police-titre);
      letter-spacing: 0.5em;
      text-align: center;
    }
    .envoyer {
      height: 52px;
      margin-top: 4px;
      border-radius: 10px;
      font-size: 15px;
    }
    .rouage {
      width: 16px;
      height: 16px;
      border: 2px solid rgb(255 255 255 / 35%);
      border-top-color: var(--lce-on-navy);
      border-radius: 50%;
      animation: tourner 700ms linear infinite;
    }
    @keyframes tourner {
      to {
        transform: rotate(1turn);
      }
    }
    .note {
      color: var(--lce-ink-muted);
      font-size: 13px;
      line-height: 20px;
      text-align: center;
    }
    .retour {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      border: 0;
      background: none;
      color: var(--lce-navy-500);
      font: 700 14px/20px var(--lce-police-texte);
      cursor: pointer;
    }
    .retour:hover {
      text-decoration: underline;
    }
    @media (max-width: 960px) {
      :host {
        grid-template-columns: minmax(0, 1fr);
        align-content: start;
      }
      .presentation {
        padding: 24px;
        gap: 20px;
      }
      .presentation::before {
        width: 260px;
        right: -110px;
        bottom: -150px;
      }
      .presentation::after,
      ul,
      .discret {
        display: none;
      }
      h1 {
        font-size: 28px;
        line-height: 34px;
      }
      .droite {
        padding: 32px 20px 48px;
      }
      .tete h2 {
        font-size: 28px;
        line-height: 34px;
      }
    }
  `,
})
export class Connexion {
  private readonly session = inject(Session);
  private readonly router = inject(Router);

  protected readonly etape = signal<'identifiants' | 'code'>('identifiants');
  protected readonly envoi = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly mdpVisible = signal(false);
  protected identifiant = '';
  protected motDePasse = '';
  protected code = '';

  constructor() {
    // Déjà connecté (session reprise) : on va directement au tableau de bord.
    effect(() => {
      if (this.session.permissions().has('tableau.voir')) void this.router.navigateByUrl('/admin');
    });
  }

  protected revenir(): void {
    this.etape.set('identifiants');
    this.code = '';
    this.erreur.set(null);
  }

  protected async valider(): Promise<void> {
    const identifiant = normaliserIdentifiant(this.identifiant);
    if (!identifiant) {
      this.erreur.set('Saisissez un numéro malien à 8 chiffres ou une adresse e-mail.');
      return;
    }
    this.erreur.set(null);
    this.envoi.set(true);
    try {
      await this.session.connecter(identifiant, this.motDePasse, this.etape() === 'code' ? this.code.replace(/\s/g, '') : undefined);
      if (!this.session.permissions().has('tableau.voir')) {
        await this.session.deconnecter();
        this.erreur.set('Ce compte n’a pas accès à l’administration.');
      }
    } catch (e) {
      const erreur = versErreurApi(e);
      if (erreur.code === 'otp-requis') this.etape.set('code');
      else this.erreur.set(erreur.messageUtilisateur);
    } finally {
      this.envoi.set(false);
    }
  }
}
