import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Bouton, Icone } from '@lce/ui';
import { AvantagesCompte } from '../composants/avantages-compte';
import { normaliserTelephone } from '../donnees/telephone';
import { Notifications } from '../etat/notifications';
import { ErreurApi, Session, versErreurApi } from '../etat/session';

type Etape = 'connexion' | 'double-authentification' | 'oubli-numero' | 'oubli-code';

/** Connexion (maquette « Connexion ») avec double authentification et mot de passe oublié. */
@Component({
  selector: 'lce-connexion',
  imports: [FormsModule, RouterLink, AvantagesCompte, Bouton, Icone],
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

  protected telephone = '';
  protected motDePasse = '';
  protected code = '';
  protected nouveauMotDePasse = '';

  protected async seConnecter(): Promise<void> {
    const telephone = this.telephoneValide();
    if (!telephone) return;
    await this.executer(async () => {
      await this.session.connecter(telephone, this.motDePasse, this.etape() === 'double-authentification' ? this.code : undefined);
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
    const telephone = this.telephoneValide();
    if (!telephone) return;
    await this.executer(async () => {
      await this.session.demanderCode(telephone, 'MOT_DE_PASSE');
      this.etape.set('oubli-code');
    });
  }

  protected async reinitialiser(): Promise<void> {
    const telephone = this.telephoneValide();
    if (!telephone) return;
    await this.executer(async () => {
      const preuve = await this.session.verifierCode(telephone, 'MOT_DE_PASSE', this.code.replace(/\s/g, ''));
      await this.session.reinitialiserMotDePasse(preuve, this.nouveauMotDePasse);
      await this.session.connecter(telephone, this.nouveauMotDePasse);
      this.notifications.afficher('Mot de passe modifié. Vous êtes connecté.');
      await this.router.navigateByUrl(this.destination());
    });
  }

  protected allerA(etape: Etape): void {
    this.erreur.set(null);
    this.code = '';
    this.etape.set(etape);
  }

  protected masque(): string {
    const t = normaliserTelephone(this.telephone);
    return t ? `+223 •• •• •• ${t.slice(-2)}` : this.telephone;
  }

  private telephoneValide(): string | null {
    const t = normaliserTelephone(this.telephone);
    if (!t) this.erreur.set('Saisissez un numéro malien à 8 chiffres, par exemple 76 12 34 56.');
    return t;
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
