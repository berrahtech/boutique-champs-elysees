import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it("affiche l'en-tête avec les 8 catégories et le pied de page", async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    // 8 catégories + « Toute la boutique » + « Promotions ».
    expect(page.querySelectorAll('#lce-categories a').length).toBe(10);
    expect(page.querySelector('lce-pied-de-page')?.textContent).toContain('Orange Money');
  });
});
