// Lantern Row — every tuning number and colour in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below depends
// on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** Points that end the festival at once. */
export const TARGET_SCORE = 40;
/** Cards dealt to each side at the start. */
export const HAND_START = 5;
/** Face-up cards in the shared market row. */
export const MARKET_SIZE = 3;
/** Hand size above which a discard is forced after taking. */
export const HAND_LIMIT = 7;

/** The five suits: colour AND shape tell them apart, never text alone. */
export const SUITS = {
  moon: { name: 'MOON', color: '#f2c14e', dark: '#8a6d1f', glyph: 'moon' },
  star: { name: 'STAR', color: '#b388eb', dark: '#5b3a8a', glyph: 'star' },
  wave: { name: 'WAVE', color: '#4fc3e8', dark: '#1d6f8f', glyph: 'wave' },
  leaf: { name: 'LEAF', color: '#7bc96f', dark: '#2f6b2a', glyph: 'leaf' },
  coin: { name: 'COIN', color: '#ef6f6c', dark: '#8f2f2d', glyph: 'coin' },
};
export const SUIT_KEYS = ['moon', 'star', 'wave', 'leaf', 'coin'];
/** Values on the numbered cards. */
export const MIN_VALUE = 1;
export const MAX_VALUE = 9;
/** Festival wild lanterns in the deck: they stand in for any card in a meld. */
export const WILD_COUNT = 5;
/** Bonus points when a meld contains a Festival wild. */
export const WILD_BONUS = 3;

/** Meld table: kind, minimum cards, base points. */
export const MELDS = {
  trio: { label: 'Trio', points: 6, min: 3 },
  run3: { label: 'Run of 3', points: 10, min: 3 },
  set3: { label: 'Set of 3', points: 8, min: 3 },
  quad: { label: 'Quartet', points: 12, min: 4 },
  run4: { label: 'Run of 4', points: 18, min: 4 },
};

export const PALETTE = {
  backdrop: '#14102a',
  felt: '#1d1740',
  feltEdge: '#2e2560',
  table: '#241c50',
  panel: '#171233',
  panelEdge: '#453a7d',
  text: '#f6efdd',
  muted: '#b9b0d8',
  gold: '#f2c14e',
  accent: '#ff9d5c',
  good: '#7bc96f',
  bad: '#ef6f6c',
  cardBack: '#3a2d6e',
  cardFace: '#fbf6e9',
  cardInk: '#241c3a',
  button: '#f2c14e',
  buttonInk: '#241c3a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Card geometry on the table. */
export const CARD = { width: 112, height: 156, radius: 10 };
export const CARD_MINI = { width: 46, height: 64, radius: 6 };

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lantern-row.best';
