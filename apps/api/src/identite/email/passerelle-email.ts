import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { masquerEmail } from '../telephone';

export interface MessageEmail {
  destinataire: string;
  sujet: string;
  texte: string;
  html: string;
}

/** Envoi d'e-mails : SMTP si SMTP_URL est défini, sinon journaux (refusé en production). */
export abstract class PasserelleEmail {
  abstract envoyer(message: MessageEmail): Promise<void>;
}

@Injectable()
export class PasserelleEmailSmtp extends PasserelleEmail {
  private readonly logger = new Logger('E-mail');
  private readonly transport: Transporter | null;
  private readonly expediteur: string;

  constructor(config: ConfigService) {
    super();
    const url = config.get<string | null>('smtpUrl');
    this.transport = url ? createTransport(url) : null;
    this.expediteur = config.get<string>('emailExpediteur') ?? '';
  }

  async envoyer({ destinataire, sujet, texte, html }: MessageEmail): Promise<void> {
    if (!this.transport) {
      this.logger.warn(`[console] ${masquerEmail(destinataire)} ← ${texte}`);
      return;
    }
    await this.transport.sendMail({ from: this.expediteur, to: destinataire, subject: sujet, text: texte, html });
  }
}

/** Message du code à usage unique, en clair et en HTML simple (lisible sur tout client mail). */
export function messageCode(destinataire: string, sujet: string, texte: string, code: string): MessageEmail {
  return {
    destinataire,
    sujet,
    texte,
    html: `<div style="font-family:Arial,sans-serif;color:#0B1C3F;max-width:480px">
  <h1 style="font-size:20px">Les Champs Élysées</h1>
  <p>${sujet} :</p>
  <p style="font-size:32px;font-weight:700;letter-spacing:6px;background:#FAF6EC;padding:16px;text-align:center">${code}</p>
  <p>Ce code est valable 5 minutes. Ne le partagez avec personne : nos équipes ne vous le demanderont jamais.</p>
  <p style="color:#5A6378;font-size:13px">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
</div>`,
  };
}
