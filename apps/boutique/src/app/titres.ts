import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

const MARQUE = 'Les Champs Élysées';

/** Titre d'onglet « Page — Les Champs Élysées » (lu en premier par les lecteurs d'écran et Google). */
@Injectable()
export class TitresLce extends TitleStrategy {
  private readonly titre = inject(Title);

  override updateTitle(etat: RouterStateSnapshot): void {
    const page = this.buildTitle(etat);
    this.titre.setTitle(page ? `${page} — ${MARQUE}` : `${MARQUE} · Shoppez mieux, vivez mieux !`);
  }
}

/** Pour les pages dont le titre dépend des données (produit, catégorie, recherche). */
export function titreDePage(page: string): string {
  return `${page} — ${MARQUE}`;
}
