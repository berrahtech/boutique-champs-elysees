import { afterNextRender, Component, DestroyRef, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Icone } from '@lce/ui';
import { CadreCompte } from '../composants/cadre-compte';
import { ConnexionSociale } from '../composants/connexion-sociale';
import { Notifications } from '../etat/notifications';
import { estEmail, masquerIdentifiant, normaliserIdentifiant, Session, versErreurApi } from '@lce/session';

type Etape = 'formulaire' | 'code';

const DELAI_RENVOI = 60;
const MOT_DE_PASSE_VALIDE = /^(?=.*[A-Za-zÀ-ÿ])(?=.*\d).{8,128}$/;

/** Inscription : nom, téléphone ou e-mail et mot de passe sur un écran, puis code de vérification. Ou Google. */
@Component({
  selector: 'lce-inscription',
  imports: [FormsModule, RouterLink, CadreCompte, ConnexionSociale, Icone],
  templateUrl: './inscription.html',
  styleUrl: './compte-formulaires.scss',
})
export class Inscription {
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  private readonly notifications = inject(Notifications);

  readonly retour = input<string>();

  protected readonly etape = signal<Etape>('formulaire');
  protected readonly envoi = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly attenteRenvoi = signal(0);
  protected readonly motDePasseVisible = signal(false);

  protected identifiant = '';
  protected code = '';
  protected nom = '';
  protected motDePasse = '';
  private minuteur?: ReturnType<typeof setInterval>;

  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => destroy.onDestroy(() => clearInterval(this.minuteur)));
  }

  /** Tout est saisi sur le même écran : on vérifie avant d'envoyer un code. */
  protected async envoyerCode(): Promise<void> {
    const identifiant = normaliserIdentifiant(this.identifiant);
    if (!this.nom.trim()) {
      this.erreur.set('Saisissez votre nom complet.');
    } else if (!identifiant) {
      this.erreur.set('Saisissez un numéro malien à 8 chiffres (76 12 34 56) ou une adresse e-mail.');
    } else if (!MOT_DE_PASSE_VALIDE.test(this.motDePasse)) {
      this.erreur.set('Le mot de passe doit contenir 8 caractères, une lettre et un chiffre.');
    } else {
      await this.executer(async () => {
        await this.session.demanderCode(identifiant, 'INSCRIPTION');
        this.code = '';
        this.etape.set('code');
        this.demarrerAttente();
      });
    }
  }

  protected async verifierCode(): Promise<void> {
    const identifiant = normaliserIdentifiant(this.identifiant)!;
    await this.executer(async () => {
      const preuve = await this.session.verifierCode(identifiant, 'INSCRIPTION', this.code.replace(/\s/g, ''));
      try {
        await this.session.inscrire(preuve, this.nom.trim(), this.motDePasse);
      } catch (e) {
        // La preuve est à usage unique : pour corriger, il faudra un nouveau code.
        this.etape.set('formulaire');
        throw e;
      }
      await this.terminer();
    });
  }

  protected modifier(): void {
    this.erreur.set(null);
    this.etape.set('formulaire');
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
      this.erreur.set(versErreurApi(e).messageUtilisateur);
    } finally {
      this.envoi.set(false);
    }
  }
}
