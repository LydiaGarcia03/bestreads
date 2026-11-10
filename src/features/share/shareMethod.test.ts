import { chooseShareMethod, shareFileName } from './shareMethod';

describe('chooseShareMethod', () => {
  it('shares on phones that can share files, downloads otherwise', () => {
    expect(chooseShareMethod({ isDesktop: false, canShareFiles: true })).toBe('share');
    expect(chooseShareMethod({ isDesktop: false, canShareFiles: false })).toBe('download');
    expect(chooseShareMethod({ isDesktop: true, canShareFiles: true })).toBe('download');
  });
});

describe('shareFileName', () => {
  it('makes a safe file name', () => {
    expect(shareFileName('Dune Messiah')).toBe('bestreads-dune-messiah.png');
    expect(shareFileName('  Memórias Póstumas de Brás Cubas!  ')).toBe('bestreads-memorias-postumas-de-bras-cubas.png');
    expect(shareFileName('My year 2026')).toBe('bestreads-my-year-2026.png');
  });

  it('caps long names and falls back when nothing is left', () => {
    expect(shareFileName('a'.repeat(100))).toBe(`bestreads-${'a'.repeat(40)}.png`);
    expect(shareFileName('人間失格')).toBe('bestreads.png');
  });
});
