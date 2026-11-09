import { Injectable, Logger } from '@nestjs/common';
import { PasserelleEmail } from '../email/passerelle-email';
import { masquerTelephone } from '../telephone';

/** Envoi de SMS. Le prestataire (Orange, Moov ou agrégateur) reste à choisir. */
export abstract class PasserelleSms {
  abstract envoyer(telephone: string, message: string): Promise<void>;
}

/**
 * Développement uniquement : écrit le SMS dans les journaux et en dépose une copie
 * dans Mailpit, où l'on lit les codes. Refusé en production par la configuration.
 */
@Injectable()
export class PasserelleSmsConsole extends PasserelleSms {
  private readonly logger = new Logger('SMS');

  constructor(private readonly email: PasserelleEmail) {
    super();
  }

  async envoyer(telephone: string, message: string): Promise<void> {
    this.logger.warn(`[console] ${masquerTelephone(telephone)} ← ${message}`);
    const destinataire = `sms-${telephone.replace(/\D/g, '')}@sms.localhost`;
    await this.email
      .envoyer({ destinataire, sujet: `SMS pour ${telephone}`, texte: message, html: `<p>${message}</p>` })
      .catch((e: unknown) => this.logger.warn(`Copie dans Mailpit impossible : ${String(e)}`));
  }
}
