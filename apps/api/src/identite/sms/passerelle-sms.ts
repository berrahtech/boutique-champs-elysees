import { Injectable, Logger } from '@nestjs/common';
import { masquerTelephone } from '../telephone';

/** Envoi de SMS. Le prestataire (Orange, Moov ou agrégateur) reste à choisir. */
export abstract class PasserelleSms {
  abstract envoyer(telephone: string, message: string): Promise<void>;
}

/** Développement uniquement : écrit le SMS dans les journaux. Refusé en production par la configuration. */
@Injectable()
export class PasserelleSmsConsole extends PasserelleSms {
  private readonly logger = new Logger('SMS');

  async envoyer(telephone: string, message: string): Promise<void> {
    this.logger.warn(`[console] ${masquerTelephone(telephone)} ← ${message}`);
  }
}
