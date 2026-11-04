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
      <div class="marque"><img src="/logo-lce.png" alt="" width="72" height="72" /><span>Les Champs Élysées</span></div>
      <div class="empile accroche">
        <span class="surtitre">Espace de gestion</span>
        <h1>Pilotez la boutique : catalogue, commandes, livraisons et paiements.</h1>
      </div>
      <span class="petit discret">Accès réservé au personnel de Les Champs Élysées. Toutes les connexions sont enregistrées.</span>
    </section>

    <section class="droite">
      <form class="carte" (ngSubmit)="valider()" novalidate>
        @if (etape() === 'identifiants') {
          <div class="empile"><h2>Connexion</h2><span class="attenue petit">Utilisez votre numéro ou votre adresse professionnelle.</span></div>
          <div class="champ">
            <label for="identifiant">Téléphone ou e-mail</label>
            <input id="identifiant" name="identifiant" class="saisie" autocomplete="username" [(ngModel)]="identifiant" />
          </div>
          <div class="champ">
            <label for="mdp">Mot de passe</label>
            <input id="mdp" name="mdp" class="saisie" type="password" autocomplete="current-password" [(ngModel)]="motDePasse" />
          </div>
        } @else {
          <span class="pastille-cadenas"><lce-icone nom="cadenas" [taille]="28" /></span>
          <div class="empile"><h2>Vérification en deux étapes</h2><span class="attenue petit">Saisissez le code à 6 chiffres envoyé sur votre téléphone et votre e-mail vérifié.</span></div>
          <div class="champ">
            <label for="code">Code de vérification</label>
            <input id="code" name="code" class="saisie code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" [(ngModel)]="code" />
          </div>
        }
        @if (erreur()) {
          <p class="erreur" role="alert"><lce-icone nom="alerte" [taille]="18" />{{ erreur() }}</p>
        }
        <button lceBouton [variante]="etape() === 'identifiants' ? 'nuit' : 'or'" type="submit" [pleineLargeur]="true" [disabled]="envoi()">
          {{ envoi() ? 'Vérification…' : etape() === 'identifiants' ? 'Continuer' : 'Se connecter' }}
        </button>
        <span class="petit attenue">Après 5 tentatives incorrectes, le compte est bloqué 15 minutes.</span>
      </form>
    </section>
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      min-height: 100vh;
    }
    .presentation {
      flex: 1 1 480px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 40px;
      padding: 64px;
      background: var(--lce-navy);
      color: var(--lce-on-navy);
    }
    .marque {
      display: flex;
      align-items: center;
      gap: 14px;
      font: 600 24px/30px var(--lce-police-titre);
    }
    .marque img {
      object-fit: contain;
    }
    .accroche {
      max-width: 460px;
      gap: 14px;
    }
    .surtitre {
      color: var(--lce-gold-bright);
      font: 600 12px/16px var(--lce-police-texte);
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      font: 600 40px/48px var(--lce-police-titre);
    }
    h2 {
      margin: 0;
      font: 600 28px/36px var(--lce-police-titre);
    }
    .discret {
      color: #a9b2c9;
    }
    .droite {
      flex: 1 1 480px;
      display: grid;
      place-items: center;
      padding: 48px 24px;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 18px;
      width: min(100%, 440px);
      padding: 36px;
    }
    .pastille-cadenas {
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--lce-gold-soft);
      color: var(--lce-gold-deep);
    }
    .code {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.3em;
    }
    @media (max-width: 767px) {
      .presentation {
        padding: 32px 24px;
      }
      h1 {
        font-size: 28px;
        line-height: 36px;
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
  protected identifiant = '';
  protected motDePasse = '';
  protected code = '';

  constructor() {
    // Déjà connecté (session reprise) : on va directement au tableau de bord.
    effect(() => {
      if (this.session.permissions().has('tableau.voir')) void this.router.navigateByUrl('/admin');
    });
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
