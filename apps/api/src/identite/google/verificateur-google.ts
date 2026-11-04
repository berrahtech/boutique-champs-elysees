import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export interface IdentiteGoogle {
  /** Identifiant stable du compte Google (l'adresse, elle, peut changer). */
  id: string;
  email: string | null;
  emailVerifie: boolean;
  nom: string | null;
}

/** Vérifie le jeton d'identité envoyé par le bouton Google. */
export abstract class VerificateurGoogle {
  abstract readonly clientId: string | null;
  /** null si le jeton est invalide, expiré, ou destiné à une autre application. */
  abstract verifier(jeton: string): Promise<IdentiteGoogle | null>;
}

@Injectable()
export class VerificateurGoogleReel extends VerificateurGoogle {
  readonly clientId: string | null;
  private readonly client = new OAuth2Client();

  constructor(config: ConfigService) {
    super();
    this.clientId = config.get<string | null>('googleClientId') ?? null;
  }

  async verifier(jeton: string): Promise<IdentiteGoogle | null> {
    if (!this.clientId) return null;
    try {
      // Contrôle la signature de Google, l'expiration et le destinataire (audience).
      const ticket = await this.client.verifyIdToken({ idToken: jeton, audience: this.clientId });
      const p = ticket.getPayload();
      if (!p?.sub) return null;
      return { id: p.sub, email: p.email?.toLowerCase() ?? null, emailVerifie: p.email_verified === true, nom: p.name ?? null };
    } catch {
      return null;
    }
  }
}
