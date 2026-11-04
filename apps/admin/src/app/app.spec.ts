import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BarreAdmin, MenuAdmin } from '@lce/ui';
import { App } from './app';

describe('Administration', () => {
  it('démarre et termine la reprise de session sans compte enregistré', async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('le menu n’affiche que les rubriques permises', async () => {
    await TestBed.configureTestingModule({ imports: [MenuAdmin], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(MenuAdmin);
    fixture.componentRef.setInput('permissions', new Set(['tableau.voir', 'stock.ajuster']));
    await fixture.whenStable();
    const liens = [...(fixture.nativeElement as HTMLElement).querySelectorAll('li a')].map((a) => a.textContent?.trim());
    expect(liens).toEqual(['Tableau de bord', 'Stocks et alertes']);
  });

  it('la barre affiche la personne connectée et propose la déconnexion', async () => {
    await TestBed.configureTestingModule({ imports: [BarreAdmin], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(BarreAdmin);
    fixture.componentRef.setInput('nomUtilisateur', 'Fanta Koné');
    fixture.componentRef.setInput('role', 'Administrateur');
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Fanta Koné');
    expect(page.querySelector('[aria-label="Se déconnecter"]')).toBeTruthy();
  });
});
