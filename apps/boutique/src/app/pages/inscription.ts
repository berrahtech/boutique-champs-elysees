import { afterNextRender, Component, DestroyRef, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Bouton, Icone } from '@lce/ui';
import { AvantagesCompte } from '../composants/avantages-compte';
import { BoutonGoogle } from '../composants/bouton-google';
import { Notifications } from '../etat/notifications';
import { estEmail, masquerIdentifiant, normaliserIdentifiant, Session, versErreurApi } from '@lce/session';

type Etape = 'numero' | 'code' | 'profil';

const DELAI_RENVOI = 60;

/** Inscription en 3 étapes (maquette « Inscription ») : téléphone ou e-mail, code, profil. Ou Google, en une étape. */
@Component({
  selector: 'lce-inscription',
  imports: [FormsModule, RouterLink, AvantagesCompte, BoutonGoogle, Bouton, Icone],
  templateUrl: './inscription.html',
  styleUrl: './compte-formulaires.scss',
})
export class Inscription {
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  private readonly notifications = inject(Notifications);

  readonly retour = input<string>();

  protected readonly etape = signal<Etape>('numero');
  protected readonly envoi = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly attenteRenvoi = signal(0);

  protected identifiant = '';
  protected code = '';
  protected nom = '';
  protected email = '';
  protected motDePasse = '';
  protected conditions = false;
  private preuve = '';
  private minuteur?: ReturnType<typeof setInterval>;

  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => destroy.onDestroy(() => clearInterval(this.minuteur)));
  }

  protected async envoyerCode(): Promise<void> {
    const identifiant = normaliserIdentifiant(this.identifiant);
    if (!identifiant) {
      this.erreur.set('Saisissez un numéro malien à 8 chiffres (76 12 34 56) ou une adresse e-mail.');
      return;
    }
    await this.executer(async () => {
      await this.session.demanderCode(identifiant, 'INSCRIPTION');
      this.etape.set('code');
      this.demarrerAttente();
    });
  }

  protected async verifierCode(): Promise<void> {
    const identifiant = normaliserIdentifiant(this.identifiant)!;
    await this.executer(async () => {
      this.preuve = await this.session.verifierCode(identifiant, 'INSCRIPTION', this.code.replace(/\s/g, ''));
      this.etape.set('profil');
    });
  }

  protected async creerCompte(): Promise<void> {
    if (!this.conditions) {
      this.erreur.set('Acceptez les conditions générales pour créer votre compte.');
      return;
    }
    await this.executer(async () => {
      await this.session.inscrire(this.preuve, this.nom.trim(), this.motDePasse, this.email.trim() || undefined);
      await this.terminer();
    });
  }

  protected changerNumero(): void {
    this.erreur.set(null);
    this.code = '';
    this.etape.set('numero');
  }

  protected async inscriptionGoogle(jeton: string): Promise<void> {
    await this.executer(async () => {
      await this.session.connecterAvecGoogle(jeton);
      await this.terminer();
    });
  }

  protected masque(): string {
    return masquerIdentifiant(this.identifiant);
  }

  /** Inscrit avec son e-mail : l'adresse est déjà connue et vérifiée, inutile de la redemander. */
  protected parEmail(): boolean {
    return estEmail(this.identifiant);
  }

  private async terminer(): Promise<void> {
    this.notifications.afficher(`Bienvenue ${this.session.prenom() ?? ''} ! Votre compte est prêt.`);
    const r = this.retour();
    await this.router.navigateByUrl(r && r.startsWith('/') && !r.startsWith('//') ? r : '/compte');
  }

  private demarrerAttente(): void {
    clearInterval(this.minuteur);
    this.attenteRenvoi.set(DELAI_RENVOI);
    this.minuteur = setInterval(() => {
      this.attenteRenvoi.update((s) => Math.max(0, s - 1));
      if (this.attenteRenvoi() === 0) clearInterval(this.minuteur);
    }, 1000);
  }

  private async executer(action: () => Promise<void>): Promise<void> {
    this.erreur.set(null);
    this.envoi.set(true);
    try {
      await action();
    } catch (e) {
      const erreur = versErreurApi(e);
      // Un code épuisé ou expiré oblige à en redemander un.
      if (erreur.code === 'otp-expire' && this.etape() === 'profil') this.etape.set('numero');
      this.erreur.set(erreur.messageUtilisateur);
    } finally {
      this.envoi.set(false);
    }
  }
}
