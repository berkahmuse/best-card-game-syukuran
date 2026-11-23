// The deck and the meld rules. A card is { id, suit, value, wild } — numbered cards
// carry a suit and a value 1..9, Festival wilds carry neither and stand in for any card
// inside a meld. Nothing here touches the browser, so the same code drives the game,
// the AI and the headless self-check.
import { MAX_VALUE, MELDS, MIN_VALUE, SUIT_KEYS, SUITS, WILD_BONUS, WILD_COUNT } from './config.js';

let nextId = 1;

/** One numbered card. */
export function makeCard(suit, value) {
  return { id: nextId++, suit, value, wild: false };
}

/** One Festival wild lantern. */
export function makeWild() {
  return { id: nextId++, suit: 'festival', value: 0, wild: true };
}

/** A fresh 50-card deck: five suits of 1..9 plus five Festival wilds. */
export function buildDeck() {
  nextId = 1;
  const deck = [];
  for (const suit of SUIT_KEYS) {
    for (let value = MIN_VALUE; value <= MAX_VALUE; value += 1) deck.push(makeCard(suit, value));
  }
  for (let i = 0; i < WILD_COUNT; i += 1) deck.push(makeWild());
  return deck;
}

/** Human-readable name of a card, for the log and the screen reader. */
export function cardName(card) {
  if (card.wild) return 'Festival Lantern';
  return `${SUITS[card.suit].name} ${card.value}`;
}

/**
 * Classify a set of cards as a meld, or return null when it is not one. The best
 * (highest-point) reading wins: a run outranks a plain trio, a quartet outranks a trio.
 * At most one wild may stand in for a missing card of the meld.
 */
export function classifyMeld(cards) {
  if (!cards || cards.length < 3 || cards.length > 4) return null;
  const wilds = cards.filter((c) => c.wild);
  const plain = cards.filter((c) => !c.wild);
  if (wilds.length > 1) return null;
  if (plain.length === 0) return null;

  const hasWild = wilds.length === 1;
  const suits = new Set(plain.map((c) => c.suit));
  const values = plain.map((c) => c.value).sort((a, b) => a - b);
  const distinctValues = new Set(values).size === values.length;
  const sameSuit = suits.size === 1;
  const sameValue = new Set(values).size === 1;

  // Runs: consecutive values, one suit, no duplicate values.
  if (sameSuit && distinctValues) {
    const span = values[values.length - 1] - values[0];
    const needed = cards.length - 1;
    if (span === needed) {
      return { kind: cards.length === 4 ? 'run4' : 'run3', points: meldPoints(cards.length === 4 ? 'run4' : 'run3', hasWild) };
    }
    // One gap the wild can fill (e.g. 2, 4 + wild -> 2, 3, 4).
    if (hasWild && span === needed + 1 && cards.length >= 3) {
      return { kind: cards.length === 4 ? 'run4' : 'run3', points: meldPoints(cards.length === 4 ? 'run4' : 'run3', true) };
    }
  }
  // Same value across different suits (a set), wild fills a third suit.
  if (sameValue && suits.size === plain.length) {
    if (cards.length === 3) return { kind: 'set3', points: meldPoints('set3', hasWild) };
    return null; // four of a value is not a meld on its own
  }
  // Same suit, any values.
  if (sameSuit) {
    if (cards.length === 4) return { kind: 'quad', points: meldPoints('quad', hasWild) };
    return { kind: 'trio', points: meldPoints('trio', hasWild) };
  }
  return null;
}

function meldPoints(kind, hasWild) {
  return MELDS[kind].points + (hasWild ? WILD_BONUS : 0);
}

/** All melds a hand contains, best first. Each entry: { cards, kind, points }. */
export function findMelds(hand) {
  const found = [];
  const seen = new Set();
  const n = hand.length;
  // All 3- and 4-card combinations; the hand is at most 8 cards, so this is cheap.
  for (let size = 3; size <= 4; size += 1) {
    const combo = [];
    (function walk(start) {
      if (combo.length === size) {
        const meld = classifyMeld(combo);
        if (meld) {
          const key = combo.map((c) => c.id).sort((a, b) => a - b).join(',');
          if (!seen.has(key)) {
            seen.add(key);
            found.push({ cards: [...combo], kind: meld.kind, points: meld.points });
          }
        }
        return;
      }
      for (let i = start; i < n; i += 1) {
        combo.push(hand[i]);
        walk(i + 1);
        combo.pop();
      }
    })(0);
  }
  found.sort((a, b) => b.points - a.points || b.cards.length - a.cards.length);
  return found;
}

/** The best single meld in a hand, or null. */
export function bestMeld(hand) {
  const melds = findMelds(hand);
  return melds.length > 0 ? melds[0] : null;
}

/** How close a hand is to a meld, for the AI's discard choice: 0..1 per card. */
export function cardUsefulness(card, hand) {
  if (card.wild) return 1;
  let score = 0;
  for (const other of hand) {
    if (other === card || other.wild) continue;
    if (other.suit === card.suit) score += 0.35;
    if (other.value === card.value) score += 0.3;
    if (other.suit === card.suit && Math.abs(other.value - card.value) <= 2) score += 0.25;
  }
  return Math.min(1, score);
}
