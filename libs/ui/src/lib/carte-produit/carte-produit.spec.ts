import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CarteProduit, ProduitCarte } from './carte-produit';

const base: ProduitCarte = {
  id: 'p1',
  slug: 'parfum',
  nom: 'Parfum',
  categorie: 'Parfums',
  prix: 40000,
  nouveau: true,
  noteMoyenne: 4.5,
  nbAvis: 3,
  imageUrl: 'x.svg',
};

async function rendre(produit: ProduitCarte) {
  await TestBed.configureTestingModule({
    imports: [CarteProduit],
    providers: [provideRouter([])],
  }).compileComponents();
  const fixture = TestBed.createComponent(CarteProduit);
  fixture.componentRef.setInput('produit', produit);
  await fixture.whenStable();
  return fixture;
}

describe('CarteProduit', () => {
  it('affiche le badge promo à la place de « Nouveau » quand le produit est réduit', async () => {
    const fixture = await rendre({ ...base, prixBarre: 50000 });
    const badges = (fixture.nativeElement as HTMLElement).querySelectorAll('lce-badge');
    expect(badges.length).toBe(1);
    expect(badges[0].textContent?.trim()).toBe('-20 %');
  });

  it('affiche « Nouveau » sans réduction', async () => {
    const fixture = await rendre(base);
    expect((fixture.nativeElement as HTMLElement).querySelector('lce-badge')?.textContent?.trim()).toBe('Nouveau');
  });

  it('désactive le bouton en cas de rupture', async () => {
    const fixture = await rendre({ ...base, enRupture: true });
    const bouton = (fixture.nativeElement as HTMLElement).querySelector('button[lcebouton]') as HTMLButtonElement;
    expect(bouton.disabled).toBe(true);
    expect(bouton.textContent).toContain('Rupture de stock');
  });

  it("émet l'identifiant au clic sur « Ajouter au panier »", async () => {
    const fixture = await rendre(base);
    let recu = '';
    fixture.componentInstance.ajouterAuPanier.subscribe((id) => (recu = id));
    ((fixture.nativeElement as HTMLElement).querySelector('button[lcebouton]') as HTMLButtonElement).click();
    expect(recu).toBe('p1');
  });
});
