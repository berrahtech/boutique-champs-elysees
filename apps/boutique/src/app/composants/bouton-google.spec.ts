import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BoutonGoogle } from './bouton-google';

async function rendre(googleClientId: string | null) {
  await TestBed.configureTestingModule({
    imports: [BoutonGoogle],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();
  const fixture = TestBed.createComponent(BoutonGoogle);
  TestBed.tick();
  TestBed.inject(HttpTestingController).expectOne('/api/v1/auth/options').flush({ googleClientId });
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('BoutonGoogle', () => {
  it('reste masqué sans identifiant client, et ne charge pas le script de Google', async () => {
    const page = await rendre(null);
    expect(page.querySelector('.cible')).toBeNull();
    expect(document.querySelector('script[src*="accounts.google.com"]')).toBeNull();
  });

  it('prépare l’emplacement du bouton quand Google est activé', async () => {
    const page = await rendre('client-test');
    expect(page.querySelector('.cible')).not.toBeNull();
    expect(document.querySelector('script[src*="accounts.google.com"]')).not.toBeNull();
  });
});
