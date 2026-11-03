import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('affiche les 5 sections du menu quand toutes les permissions sont accordées', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const titres = (fixture.nativeElement as HTMLElement).querySelectorAll('lce-menu-admin h2');
    expect(titres.length).toBe(5);
  });
});
