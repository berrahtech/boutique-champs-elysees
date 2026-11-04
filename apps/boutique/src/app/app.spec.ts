import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { CategoriePublique } from '@lce/contrats';
import { App } from './app';

const categorie = (slug: string): CategoriePublique => ({ id: slug, slug, nom: slug, court: slug, icone: 'divers', nbProduits: 1 });

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it("affiche l'en-tête avec les catégories de l'API et le pied de page", async () => {
    const fixture = TestBed.createComponent(App);
    TestBed.tick();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/categories')
      .flush(['mode', 'maison'].map(categorie));
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    // 2 catégories + « Toute la boutique » + « Promotions ».
    expect(page.querySelectorAll('#lce-categories a').length).toBe(4);
    expect(page.querySelector('lce-pied-de-page')?.textContent).toContain('Orange Money');
  });
});
