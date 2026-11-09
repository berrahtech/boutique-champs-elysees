import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { MoyenPaiement, RapportFinances } from '@lce/contrats';
import { API } from '@lce/session';
import { FcfaPipe, Icone } from '@lce/ui';

type Periode = '7j' | '30j' | '12m';

const MOYENS: Record<MoyenPaiement, string> = {
  A_LA_LIVRAISON: 'À la livraison',
  ORANGE_MONEY: 'Orange Money',
  MOOV_MONEY: 'Moov Money',
  CARTE: 'Carte bancaire',
};

/** Finances : chiffre d'affaires des commandes livrées (maquette « A-Finances »). */
@Component({
  selector: 'lce-finances',
  imports: [DatePipe, RouterLink, FcfaPipe, Icone],
  template: `
    <div class="adm-corps">
      <div class="adm-titre">
        <div class="empile">
          <h1>Finances</h1>
          <span class="attenue petit">Calculé sur les commandes livrées, à la date de commande.</span>
        </div>
        <div class="onglets" role="tablist" aria-label="Période">
          @for (p of periodes; track p.id) {
            <button type="button" role="tab" class="onglet" [class.on]="periode() === p.id" [attr.aria-selected]="periode() === p.id" (click)="periode.set(p.id)">{{ p.libelle }}</button>
          }
        </div>
      </div>

      @if (rapport(); as r) {
        <div class="indicateurs" [class.recharge]="ressource.isLoading()">
          <div class="indicateur"><span class="icone-teinte noir"><lce-icone nom="finances" [taille]="22" /></span><span class="l">Chiffre d'affaires</span><span class="v">{{ r.chiffreAffaires | fcfa }}</span></div>
          <div class="indicateur"><span class="icone-teinte vert"><lce-icone nom="succes" [taille]="22" /></span><span class="l">Commandes livrées</span><span class="v">{{ r.commandesLivrees }}</span><span class="d">sur {{ r.commandesPassees }} passées · {{ r.commandesAnnulees }} annulée(s)</span></div>
          <div class="indicateur"><span class="icone-teinte"><lce-icone nom="panier" [taille]="22" /></span><span class="l">Panier moyen</span><span class="v">{{ r.panierMoyen | fcfa }}</span></div>
          <a class="indicateur" routerLink="/admin/livreurs"><span class="icone-teinte or"><lce-icone nom="especes" [taille]="22" /></span><span class="l">Chez les livreurs</span><span class="v or">{{ r.aReverser | fcfa }}</span><span class="d">encaissé, à remettre à la boutique</span></a>
        </div>

        <section class="carte">
          <div class="entre">
            <h2 class="titre-carte">Évolution du chiffre d'affaires</h2>
            <span class="petit attenue">{{ r.debut | date: 'd MMM yyyy' }} → {{ r.fin | date: 'd MMM yyyy' }}</span>
          </div>
          <div class="graphique" role="img" [attr.aria-label]="'Chiffre d’affaires par ' + (periode() === '12m' ? 'mois' : 'jour') + ', maximum ' + max() + ' FCFA'">
            <div class="axe">
              <span>{{ max() | fcfa }}</span>
              <span>{{ max() / 2 | fcfa }}</span>
              <span>0</span>
            </div>
            <div class="barres" [style.--n]="r.serie.length">
              @for (p of r.serie; track p.periode) {
                <div class="colonne" [title]="libellePeriode(p.periode) + ' : ' + (p.chiffre | fcfa) + ' · ' + p.commandes + ' commande(s)'">
                  <span class="barre" [class.vide]="!p.chiffre" [style.height.%]="max() ? (p.chiffre / max()) * 100 : 0"></span>
                  @if (afficherEtiquette($index, r.serie.length)) {
                    <small>{{ libelleCourt(p.periode) }}</small>
                  }
                </div>
              }
            </div>
          </div>
          @if (!r.chiffreAffaires) {
            <p class="petit attenue vide">Aucune commande livrée sur cette période.</p>
          }
        </section>

        <div class="trois">
          <section class="carte">
            <h2>Par zone</h2>
            @for (z of r.parZone; track z.zone) {
              <div class="repartition">
                <span class="entre petit"><b>{{ z.zone }}</b><span class="chiffres">{{ z.chiffre | fcfa }}</span></span>
                <span class="jauge"><span [style.width.%]="(z.chiffre / (r.chiffreAffaires || 1)) * 100"></span></span>
              </div>
            } @empty {
              <p class="petit attenue">Pas encore de données.</p>
            }
          </section>
          <section class="carte">
            <h2>Par moyen de paiement</h2>
            @for (m of r.parMoyen; track m.moyen) {
              <div class="repartition">
                <span class="entre petit"><b>{{ moyens[m.moyen] }}</b><span class="chiffres">{{ m.chiffre | fcfa }}</span></span>
                <span class="jauge noire"><span [style.width.%]="(m.chiffre / (r.chiffreAffaires || 1)) * 100"></span></span>
              </div>
            } @empty {
              <p class="petit attenue">Pas encore de données.</p>
            }
            <dl>
              <div><dt>Remises accordées</dt><dd class="chiffres">{{ r.remises | fcfa }}</dd></div>
              <div><dt>Frais de livraison facturés</dt><dd class="chiffres">{{ r.fraisLivraison | fcfa }}</dd></div>
            </dl>
          </section>
          <section class="carte">
            <h2>Meilleurs produits</h2>
            <ol class="top">
              @for (p of r.meilleursProduits; track p.produitId; let i = $index) {
                <li>
                  <span class="rang">{{ i + 1 }}</span>
                  <span class="empile"><a [routerLink]="['/admin/produits', p.produitId]">{{ p.libelle }}</a><small class="attenue">{{ p.quantite }} vendu(s)</small></span>
                  <b class="chiffres">{{ p.chiffre | fcfa }}</b>
                </li>
              } @empty {
                <li class="petit attenue">Pas encore de ventes livrées.</li>
              }
            </ol>
          </section>
        </div>
      } @else if (ressource.error()) {
        <p class="erreur" role="alert"><lce-icone nom="alerte" [taille]="18" />Impossible de charger les finances.</p>
      } @else {
        <div class="indicateurs">
          @for (n of [1, 2, 3, 4]; track n) {
            <span class="carte squelette" style="height: 96px"></span>
          }
        </div>
        <span class="squelette" style="height: 300px; border-radius: 16px"></span>
      }
    </div>
  `,
  styles: `
    .recharge {
      opacity: 0.6;
      transition: opacity 200ms;
    }
    .graphique {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 12px;
      height: 260px;
      margin-top: 18px;
    }
    .axe {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding-bottom: 22px;
      color: var(--lce-ink-muted);
      font-size: 11px;
      text-align: right;
    }
    .barres {
      display: grid;
      grid-template-columns: repeat(var(--n), minmax(0, 1fr));
      gap: 4px;
      align-items: end;
      border-bottom: 1px solid var(--adm-ligne);
      background: repeating-linear-gradient(to top, transparent 0, transparent calc(50% - 1px), var(--adm-ligne) calc(50% - 1px), var(--adm-ligne) 50%);
      background-size: 100% calc(100% - 22px);
      background-repeat: no-repeat;
    }
    .colonne {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      height: 100%;
      padding-bottom: 22px;
    }
    .barre {
      display: block;
      min-height: 2px;
      border-radius: 6px 6px 2px 2px;
      background: var(--lce-gold);
      transition:
        height 500ms cubic-bezier(0.2, 0.8, 0.2, 1),
        background-color 150ms;
    }
    .barre.vide {
      background: var(--lce-neutre-soft);
    }
    .colonne:hover .barre:not(.vide) {
      background: var(--lce-navy);
    }
    .colonne small {
      position: absolute;
      bottom: 0;
      left: 50%;
      color: var(--lce-ink-muted);
      font-size: 11px;
      white-space: nowrap;
      transform: translateX(-50%);
    }
    .vide {
      margin: 12px 0 0;
      text-align: center;
    }
    .trois {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 20px;
      align-items: start;
    }
    .repartition {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    }
    .jauge {
      height: 8px;
      overflow: hidden;
      border-radius: 4px;
      background: var(--lce-neutre-soft);
    }
    .jauge span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--lce-gold);
    }
    .jauge.noire span {
      background: var(--lce-navy);
    }
    dl {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 16px 0 0;
      padding-top: 14px;
      border-top: 1px solid var(--adm-ligne);
      font-size: 13px;
    }
    dl div {
      display: flex;
      justify-content: space-between;
    }
    dt {
      color: var(--lce-ink-muted);
    }
    dd {
      margin: 0;
      font-weight: 700;
    }
    .top {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .top li {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .top .empile {
      flex: 1;
      min-width: 0;
    }
    .top a {
      overflow: hidden;
      color: var(--lce-ink);
      font-weight: 700;
      text-decoration: none;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .rang {
      display: grid;
      place-items: center;
      flex: none;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: var(--lce-gold-soft);
      color: var(--lce-gold-text);
      font: 900 13px/1 var(--lce-police-titre);
    }
    @media (max-width: 1100px) {
      .trois {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class Finances {
  protected readonly periodes = [
    { id: '7j' as const, libelle: '7 jours' },
    { id: '30j' as const, libelle: '30 jours' },
    { id: '12m' as const, libelle: '12 mois' },
  ];
  protected readonly moyens = MOYENS;
  protected readonly periode = signal<Periode>('30j');

  protected readonly ressource = httpResource<RapportFinances>(() => ({ url: `${API}/admin/finances`, params: { periode: this.periode() } }));
  protected readonly rapport = linkedSignal<RapportFinances | undefined, RapportFinances | undefined>({
    source: () => (this.ressource.hasValue() ? this.ressource.value() : undefined),
    computation: (v, p) => v ?? p?.value,
  });
  /** Haut de l'échelle, arrondi pour des graduations lisibles. */
  protected readonly max = computed(() => {
    const m = Math.max(0, ...(this.rapport()?.serie ?? []).map((p) => p.chiffre));
    if (!m) return 0;
    const pas = 10 ** Math.floor(Math.log10(m));
    return Math.ceil(m / pas) * pas;
  });

  protected libellePeriode(p: string): string {
    const d = new Date(p.length === 7 ? `${p}-01T00:00:00Z` : `${p}T00:00:00Z`);
    return d.toLocaleDateString('fr-FR', p.length === 7 ? { month: 'long', year: 'numeric', timeZone: 'UTC' } : { day: 'numeric', month: 'long', timeZone: 'UTC' });
  }

  protected libelleCourt(p: string): string {
    const d = new Date(p.length === 7 ? `${p}-01T00:00:00Z` : `${p}T00:00:00Z`);
    return d.toLocaleDateString('fr-FR', p.length === 7 ? { month: 'short', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' });
  }

  /** Sur 30 jours, une étiquette sur 5 : les dates restent lisibles. */
  protected afficherEtiquette(i: number, n: number): boolean {
    const pas = n > 14 ? 5 : 1;
    return i % pas === 0 || i === n - 1;
  }
}
