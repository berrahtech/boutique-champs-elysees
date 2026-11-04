import { TestBed } from '@angular/core/testing';
import { Recents } from './recents';

describe('Recents', () => {
  beforeEach(() => localStorage.clear());

  it('garde le dernier produit consulté en tête, sans doublon', () => {
    const recents = TestBed.inject(Recents);
    recents.noter('a');
    recents.noter('b');
    recents.noter('a');
    expect(recents.ids()).toEqual(['a', 'b']);
  });

  it('oublie les plus anciens au-delà de 12 produits', () => {
    const recents = TestBed.inject(Recents);
    for (let i = 0; i < 14; i++) recents.noter(`p${i}`);
    expect(recents.ids().length).toBe(12);
    expect(recents.ids()[0]).toBe('p13');
    expect(recents.ids()).not.toContain('p0');
  });
});
