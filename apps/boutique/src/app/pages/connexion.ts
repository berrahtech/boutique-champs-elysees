import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Icone } from '@lce/ui';
import { CadreCompte } from '../composants/cadre-compte';
import { ConnexionSociale } from '../composants/connexion-sociale';
import { Notifications } from '../etat/notifications';
import { ErreurApi, masquerIdentifiant, normaliserIdentifiant, Session, versErreurApi } from '@lce/session';

type Etape = 'connexion' | 'double-authentification' | 'oubli-numero' | 'oubli-code';

/** Connexion (maquette « Connexion ») avec double authentification et mot de passe oublié. */
@Component({
  selector: 'lce-connexion',
  imports: [FormsModule, RouterLink, CadreCompte, ConnexionSociale, Icone],
  templateUrl: './connexion.html',
  styleUrl: './compte-formulaires.scss',
})
export class Connexion {
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  private readonly notifications = inject(Notifications);

  /** Page où revenir après connexion (ex. /panier). */
  readonly retour = input<string>();

  protected readonly etape = signal<Etape>('connexion');
  protected readonly envoi = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly motDePasseVisible = signal(false);

  protected identifiant = '';
  protected motDePasse = '';
  protected code = '';
  protected nouveauMotDePasse = '';

  protected async seConnecter(): Promise<void> {
    const identifiant = this.identifiantValide();
    if (!identifiant) return;
    await this.executer(async () => {
      await this.session.connecter(identifiant, this.motDePasse, this.etape() === 'double-authentification' ? this.code : undefined);
      this.notifications.afficher(`Bienvenue ${this.session.prenom() ?? ''} !`);
      await this.router.navigateByUrl(this.destination());
    }, (e) => {
      if (e.code === 'otp-requis') {
        this.etape.set('double-authentification');
        return true;
      }
      return false;
    });
  }

  protected async demanderCodeOubli(): Promise<void> {
    const identifiant = this.identifiantValide();
    if (!identifiant) return;
    await this.executer(async () => {
      await this.session.demanderCode(identifiant, 'MOT_DE_PASSE');
      this.etape.set('oubli-code');
    });
  }

  protected async reinitialiser(): Promise<void> {
    const identifiant = this.identifiantValide();
    if (!identifiant) return;
    await this.executer(async () => {
      const preuve = await this.session.verifierCode(identifiant, 'MOT_DE_PASSE', this.code.replace(/\s/g, ''));
      await this.session.reinitialiserMotDePasse(preuve, this.nouveauMotDePasse);
      await this.session.connecter(identifiant, this.nouveauMotDePasse);
      this.notifications.afficher('Mot de passe modifié. Vous êtes connecté.');
      await this.router.navigateByUrl(this.destination());
    });
  }

  protected allerA(etape: Etape): void {
    this.erreur.set(null);
    this.code = '';
    this.etape.set(etape);
  }

  protected async connexionGoogle(jeton: string): Promise<void> {
    await this.executer(async () => {
      await this.session.connecterAvecGoogle(jeton);
      this.notifications.afficher(`Bienvenue ${this.session.prenom() ?? ''} !`);
      await this.router.navigateByUrl(this.destination());
    });
  }

  protected masque(): string {
    return masquerIdentifiant(this.identifiant);
  }

  private identifiantValide(): string | null {
    const i = normaliserIdentifiant(this.identifiant);
    if (!i) this.erreur.set('Saisissez un numéro malien à 8 chiffres (76 12 34 56) ou une adresse e-mail.');
    return i;
  }

  private destination(): string {
    const r = this.retour();
    return r && r.startsWith('/') && !r.startsWith('//') ? r : '/compte';
  }

  /** Lance une action réseau : bouton désactivé pendant l'envoi, erreur traduite en français. */
  private async executer(action: () => Promise<void>, gerer?: (e: ErreurApi) => boolean): Promise<void> {
    this.erreur.set(null);
    this.envoi.set(true);
    try {
      await action();
    } catch (e) {
      const erreur = versErreurApi(e);
      if (!gerer?.(erreur)) this.erreur.set(erreur.messageUtilisateur);
    } finally {
      this.envoi.set(false);
    }
  }
}
