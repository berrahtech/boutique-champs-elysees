import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formate un montant entier en FCFA : espace insécable fine comme séparateur
 * de milliers, devise après, sans décimale. 153600 → « 153 600 FCFA ».
 */
export function formaterFcfa(montant: number): string {
  const entier = Math.round(montant);
  const signe = entier < 0 ? '-' : '';
  const chiffres = Math.abs(entier)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
  return `${signe}${chiffres}\u00A0FCFA`;
}

@Pipe({ name: 'fcfa' })
export class FcfaPipe implements PipeTransform {
  transform(montant: number | null | undefined): string {
    return montant == null ? '' : formaterFcfa(montant);
  }
}
