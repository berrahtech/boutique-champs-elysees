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
  it('affiche le badge de réduction à la place de « Nouveau » quand le produit est réduit', async () => {
    const fixture = await rendre({ ...base, prixBarre: 50000 });
    const badges = [...(fixture.nativeElement as HTMLElement).querySelectorAll('lce-badge')].map((b) => b.textContent?.trim());
    expect(badges).toEqual(['−20 %']);
  });

  it('prévient quand le stock est faible, et n’affiche rien sinon', async () => {
    const faible = await rendre({ ...base, nouveau: false, stock: 3 });
    expect((faible.nativeElement as HTMLElement).textContent).toContain('Plus que 3');
    faible.componentRef.setInput('produit', { ...base, nouveau: false, stock: 40 });
    await faible.whenStable();
    expect((faible.nativeElement as HTMLElement).querySelector('.alerte')).toBeNull();
  });

  it('affiche « Nouveau » sans réduction', async () => {
    const fixture = await rendre(base);
    expect((fixture.nativeElement as HTMLElement).querySelector('lce-badge')?.textContent?.trim()).toBe('Nouveau');
  });

  it('désactive le bouton en cas de rupture', async () => {
    const fixture = await rendre({ ...base, enRupture: true });
    const page = fixture.nativeElement as HTMLElement;
    expect((page.querySelector('.ajouter') as HTMLButtonElement).disabled).toBe(true);
    expect(page.textContent).toContain('Rupture');
  });

  it("émet l'identifiant au clic sur « Ajouter au panier »", async () => {
    const fixture = await rendre(base);
    let recu = '';
    fixture.componentInstance.ajouterAuPanier.subscribe((id) => (recu = id));
    ((fixture.nativeElement as HTMLElement).querySelector('.ajouter') as HTMLButtonElement).click();
    expect(recu).toBe('p1');
  });
});
