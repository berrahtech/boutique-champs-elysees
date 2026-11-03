import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Probleme } from './probleme';

/** Transforme toute erreur en réponse application/problem+json (RFC 9457). */
@Catch()
export class ProblemeFilter implements ExceptionFilter {
  private readonly logger = new Logger('Erreurs');

  catch(erreur: unknown, hote: ArgumentsHost): void {
    const http = hote.switchToHttp();
    const requete = http.getRequest<Request>();
    const reponse = http.getResponse<Response>();

    let corps: Record<string, unknown>;
    if (erreur instanceof Probleme) {
      corps = {
        type: `/problemes/${erreur.code}`,
        title: erreur.titre,
        status: erreur.statut,
        ...(erreur.detail && { detail: erreur.detail }),
        ...erreur.extensions,
      };
    } else if (erreur instanceof HttpException) {
      const statut = erreur.getStatus();
      corps = { type: 'about:blank', title: erreur.message, status: statut };
    } else {
      // Erreur imprévue : on journalise tout, on ne renvoie rien d'interne.
      this.logger.error(erreur instanceof Error ? erreur.stack : String(erreur));
      corps = { type: 'about:blank', title: 'Erreur interne', status: HttpStatus.INTERNAL_SERVER_ERROR };
    }

    reponse
      .status(corps['status'] as number)
      .type('application/problem+json')
      .json({ ...corps, instance: requete.originalUrl });
  }
}
