import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Notifications } from '../etat/notifications';
import { ConnexionSociale } from './connexion-sociale';

async function rendre(googleClientId: string | null) {
  await TestBed.configureTestingModule({
    imports: [ConnexionSociale],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();
  const fixture = TestBed.createComponent(ConnexionSociale);
  fixture.componentRef.setInput('action', 'Se connecter');
  TestBed.tick();
  TestBed.inject(HttpTestingController).expectOne('/api/v1/auth/options').flush({ googleClientId });
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('ConnexionSociale', () => {
  it('sans identifiant client, ne charge pas le script de Google et prévient au clic', async () => {
    const page = await rendre(null);
    expect(page.querySelector('.cible')).toBeNull();
    expect(document.querySelector('script[src*="accounts.google.com"]')).toBeNull();
    (page.querySelector('.google') as HTMLButtonElement).click();
    expect(TestBed.inject(Notifications).courante()?.message).toContain('Google');
  });

  it('prévient que Facebook n’est pas encore disponible', async () => {
    const page = await rendre(null);
    expect(page.querySelector('.facebook')?.textContent).toContain('Se connecter avec Facebook');
    (page.querySelector('.facebook') as HTMLButtonElement).click();
    expect(TestBed.inject(Notifications).courante()?.message).toContain('Facebook');
  });

  it('prépare l’emplacement du bouton quand Google est activé', async () => {
    const page = await rendre('client-test');
    expect(page.querySelector('.cible')).not.toBeNull();
    expect(page.querySelector('.google')).toBeNull();
    expect(document.querySelector('script[src*="accounts.google.com"]')).not.toBeNull();
  });
});
