import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Illustration des pages de connexion et d'inscription : un client devant la boutique sur téléphone. */
@Component({
  selector: 'lce-illustration-compte',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 680 590" role="img" aria-label="Un client montre des articles sur un grand téléphone">
      <defs>
        <linearGradient id="ic-ecran" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#4C8DF5" />
          <stop offset="1" stop-color="#1E55C8" />
        </linearGradient>
        <linearGradient id="ic-chemise" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#F7A92B" />
          <stop offset="1" stop-color="#E8891A" />
        </linearGradient>
        <linearGradient id="ic-peau" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#F6B99B" />
          <stop offset="1" stop-color="#E79A7C" />
        </linearGradient>
        <linearGradient id="ic-short" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#5D8FB5" />
          <stop offset="1" stop-color="#3F6F96" />
        </linearGradient>
        <linearGradient id="ic-carton" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#D9A877" />
          <stop offset="1" stop-color="#C4905F" />
        </linearGradient>
        <filter id="ic-ombre" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#10245E" flood-opacity="0.3" />
        </filter>
        <clipPath id="ic-t1"><rect x="224" y="96" width="132" height="186" rx="16" /></clipPath>
        <clipPath id="ic-t2"><rect x="370" y="96" width="132" height="186" rx="16" /></clipPath>
        <clipPath id="ic-t3"><rect x="224" y="306" width="132" height="186" rx="16" /></clipPath>
      </defs>

      <!-- Sol -->
      <rect x="0" y="556" width="680" height="7" rx="2" fill="#5DB56B" />
      <rect x="0" y="563" width="680" height="9" fill="#E7E2DF" />

      <!-- Téléphone -->
      <rect x="282" y="26" width="256" height="530" rx="32" fill="#1B47AE" />
      <rect x="274" y="26" width="256" height="530" rx="32" fill="url(#ic-ecran)" />
      <rect x="350" y="52" width="72" height="18" rx="9" fill="#FFFFFF" />
      <circle cx="444" cy="61" r="9" fill="#FFFFFF" />

      <!-- Articles -->
      <g filter="url(#ic-ombre)">
        <rect x="224" y="96" width="132" height="186" rx="16" fill="#FFFFFF" />
        <rect x="370" y="96" width="132" height="186" rx="16" fill="#FFFFFF" />
        <rect x="224" y="306" width="132" height="186" rx="16" fill="#FFFFFF" />
      </g>
      <image href="/illustration/baskets.webp" x="224" y="96" width="132" height="186" preserveAspectRatio="xMidYMid slice" clip-path="url(#ic-t1)" />
      <image href="/illustration/sandales.webp" x="370" y="96" width="132" height="186" preserveAspectRatio="xMidYMid slice" clip-path="url(#ic-t2)" />
      <image href="/illustration/tee-shirt.webp" x="224" y="306" width="132" height="186" preserveAspectRatio="xMidYMid slice" clip-path="url(#ic-t3)" />

      <!-- Carte bancaire -->
      <g filter="url(#ic-ombre)">
        <rect x="374" y="332" width="166" height="122" rx="10" fill="#EFA63B" />
        <rect x="374" y="402" width="166" height="24" fill="#2B2B2B" />
        <rect x="392" y="348" width="94" height="8" rx="2" fill="#F8D08A" />
        <rect x="498" y="348" width="30" height="8" rx="2" fill="#F8D08A" />
        <rect x="436" y="368" width="88" height="22" rx="2" fill="#FFFFFF" />
      </g>

      <!-- Cartons -->
      <rect x="520" y="434" width="122" height="122" fill="#7C4B2C" />
      <path d="M578 434h20v34l-10-7-10 7z" fill="#E7C9A6" />
      <rect x="458" y="478" width="136" height="78" fill="url(#ic-carton)" />
      <path d="M534 478h22v30l-11-8-11 8z" fill="#8A5A36" />

      <!-- Plantes -->
      <path d="M300 556c-8-20-22-28-34-30 8 10 10 22 16 30zM300 556c4-22 16-32 30-36-6 12-8 26-14 36zM300 556c-2-14 0-26 4-34 6 10 8 22 8 34z" fill="#57B266" />
      <path d="M606 556c-8-16-18-22-28-24 6 8 8 18 14 24zM606 556c4-18 14-26 26-30-6 10-8 22-12 30z" fill="#57B266" />

      <!-- Pastille de réduction -->
      <g transform="translate(528 56)" filter="url(#ic-ombre)">
        <polygon fill="#D7231E" points="0,-46 11,-33 26,-39 29,-23 45,-20 39,-5 50,8 36,16 37,32 21,31 13,46 0,37 -13,46 -21,31 -37,32 -36,16 -50,8 -39,-5 -45,-20 -29,-23 -26,-39 -11,-33" />
        <text x="0" y="14" text-anchor="middle" fill="#FFFFFF" font-size="38" font-weight="700" font-family="Figtree, system-ui, sans-serif">%</text>
      </g>

      <!-- Client -->
      <!-- Jambe gauche et chaussure -->
      <path d="M72 396h44l-4 134H84z" fill="url(#ic-peau)" />
      <path d="M126 396h44l-6 134h-28z" fill="url(#ic-peau)" />
      <path d="M74 524h40v14c-2 10-44 12-54 12-6 0-8-6-4-10 8-6 14-10 18-16z" fill="#1F1F24" />
      <path d="M54 550h60v6H54z" fill="#FFFFFF" />
      <path d="M134 524h34c6 8 14 14 24 18 6 3 4 8-2 8h-56z" fill="#1F1F24" />
      <path d="M134 550h60v6h-60z" fill="#FFFFFF" />
      <!-- Short -->
      <path d="M62 300h116l12 116c-20 6-40 6-58 2l-10-62-12 62c-18 4-36 4-58-2z" fill="url(#ic-short)" />
      <!-- Bras tendu vers les articles -->
      <path d="M160 214c30 22 52 40 68 46l-6 26c-26-6-54-24-78-46z" fill="url(#ic-peau)" />
      <path d="M226 256c10 0 26-6 32-4 6 2 4 8-2 10l-10 4c8 0 12 4 8 8-4 5-22 12-32 10z" fill="url(#ic-peau)" />
      <!-- Chemise -->
      <path d="M92 150c-18 4-30 12-40 28l-16 42 30 14 8-16 2 92c32 10 72 10 104 0l2-96 12 12 26-26-26-30c-10-10-24-16-40-20z" fill="url(#ic-chemise)" />
      <path d="M100 148h44l-6 160c-10 2-22 2-32 0z" fill="#FFF6E7" />
      <!-- Bras levé et main -->
      <path d="M36 220l30 12c-4 14-12 24-20 28-12 4-24-4-26-16-2-10 4-26 16-24z" fill="url(#ic-peau)" transform="translate(0 -14)" />
      <path d="M18 196l-6-34c-1-6 7-8 9-2l7 26 2-30c0-6 8-6 9 0l1 40c6 2 8 12 2 18-8 6-20 6-24-2z" fill="url(#ic-peau)" />
      <!-- Cou et tête -->
      <path d="M106 128h32v26c-8 10-24 10-32 0z" fill="#DE9173" />
      <circle cx="72" cy="94" r="11" fill="#E79A7C" />
      <circle cx="172" cy="94" r="11" fill="#E79A7C" />
      <ellipse cx="122" cy="88" rx="50" ry="54" fill="url(#ic-peau)" />
      <path d="M70 84c-8-34 10-62 40-68l6-14 8 12 16-8 0 14c22 6 36 28 32 62-8-16-18-26-32-30-22 8-44 10-58 6-6 8-10 16-12 26z" fill="#1F1F24" />
      <ellipse cx="102" cy="88" rx="8" ry="10" fill="#FFFFFF" />
      <ellipse cx="144" cy="88" rx="8" ry="10" fill="#FFFFFF" />
      <circle cx="103" cy="90" r="5" fill="#2A2A33" />
      <circle cx="145" cy="90" r="5" fill="#2A2A33" />
      <path d="M92 72c6-4 14-4 20-1M134 71c6-3 14-3 20 1" fill="none" stroke="#1F1F24" stroke-width="3.500" stroke-linecap="round" />
      <path d="M104 112c10 12 30 12 40 0-6 16-34 16-40 0z" fill="#B23A32" />
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    svg {
      display: block;
      width: 100%;
      height: auto;
    }
  `,
})
export class IllustrationCompte {}
