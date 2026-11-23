// Lantern Row's rules and state, with no drawing and no browser in it: the deck, the
// market row, both hands, the meld piles, the score race to 40 and Madame Lumen, the
// AI rival. Nothing here allocates after createWorld returns, and the same code drives
// the live game, the AI turns and the headless self-check.
import {
  HAND_LIMIT, HAND_START, MARKET_SIZE, SUITS, SUIT_KEYS, TARGET_SCORE,
} from './config.js';
import { bestMeld, buildDeck, cardName, cardUsefulness, classifyMeld, findMelds } from './cards.js';
import { shuffle } from './random.js';

export const SIDE_PLAYER = 'player';
export const SIDE_AI = 'ai';

export const PHASE_TAKE = 'take';
export const PHASE_MELD = 'meld';
export const PHASE_DISCARD = 'discard';
export const PHASE_OVER = 'over';

/** Points for a blind draw, as the AI's baseline when it weighs the market. */
const DRAW_BASELINE = 2.5;

function newSide(name, title) {
  return { name, title, hand: [], melds: [], score: 0, meldCount: 0, bestMeld: 0 };
}

export function createWorld(random) {
  const player = newSide('You', 'You');
  const ai = newSide('Madame Lumen', 'Madame Lumen');
  const state = {
    deck: [],
    market: [],
    discard: [],
    player,
    ai,
    turn: SIDE_PLAYER,
    phase: PHASE_TAKE,
    round: 1,
    ply: 0,
    endPly: null,
    finale: null,
    winner: null,
    reason: '',
    log: [],
    lastPlay: null,
    meldedThisTurn: false,
  };

  function log(message) {
    state.log.push(message);
    if (state.log.length > 7) state.log.shift();
  }

  function sideOf(side) {
    return side === SIDE_PLAYER ? player : ai;
  }

  function refillMarket() {
    while (state.market.length < MARKET_SIZE && state.deck.length > 0) {
      state.market.push(state.deck.pop());
    }
  }

  function noteDeckEmpty() {
    if (state.deck.length === 0 && state.endPly === null) {
      state.endPly = state.ply + 3;
      log('The deck is empty — three turns remain.');
    }
  }

  function reset() {
    state.deck = shuffle(buildDeck(), random);
    state.market = [];
    state.discard = [];
    for (const side of [player, ai]) {
      side.hand = [];
      side.melds = [];
      side.score = 0;
      side.meldCount = 0;
      side.bestMeld = 0;
    }
    state.turn = SIDE_PLAYER;
    state.phase = PHASE_TAKE;
    state.round = 1;
    state.ply = 0;
    state.endPly = null;
    state.finale = null;
    state.winner = null;
    state.reason = '';
    state.log = [];
    state.lastPlay = null;
    state.meldedThisTurn = false;
    for (let i = 0; i < HAND_START; i += 1) {
      player.hand.push(state.deck.pop());
      ai.hand.push(state.deck.pop());
    }
    refillMarket();
    log('Welcome to Lantern Row. Take a card to begin.');
  }

  function finishByScore() {
    state.phase = PHASE_OVER;
    if (state.finale) {
      state.reason = `${state.finale.leader} reached ${TARGET_SCORE} — the finale is over, highest score wins.`;
    } else {
      state.reason = 'The deck ran out — highest score wins.';
    }
    if (player.score === ai.score) {
      state.winner = player.meldCount === ai.meldCount ? 'draw' : (player.meldCount > ai.meldCount ? SIDE_PLAYER : SIDE_AI);
      state.reason += ' Tied on points — most melds wins.';
    } else {
      state.winner = player.score > ai.score ? SIDE_PLAYER : SIDE_AI;
    }
    log(state.winner === SIDE_PLAYER ? 'You win the festival!' : state.winner === SIDE_AI ? 'Madame Lumen wins the festival.' : 'A dead heat!');
  }

  /**
   * Reaching the target starts the finale instead of ending at once: the rival gets
   * one last turn to catch up, so the first move is not the whole race.
   */
  function checkTarget(side) {
    if (side.score < TARGET_SCORE || state.finale) return false;
    state.finale = { leader: side.title, rival: side === player ? SIDE_AI : SIDE_PLAYER };
    log(`${side.title} reached ${TARGET_SCORE} — the finale begins! One last turn each.`);
    return false;
  }

  /** Take the face-up market card at `index`. Only during the take phase. */
  function takeMarket(index) {
    if (state.phase !== PHASE_TAKE) return { ok: false, message: 'Not the take step.' };
    const card = state.market[index];
    if (!card) return { ok: false, message: 'No card there.' };
    const side = sideOf(state.turn);
    state.market.splice(index, 1);
    side.hand.push(card);
    refillMarket();
    noteDeckEmpty();
    state.phase = PHASE_MELD;
    log(`${side.title} took ${cardName(card)} from the market.`);
    return { ok: true, card };
  }

  /** Draw blind from the deck. Only during the take phase. */
  function takeDeck() {
    if (state.phase !== PHASE_TAKE) return { ok: false, message: 'Not the take step.' };
    if (state.deck.length === 0) return { ok: false, message: 'The deck is empty — take from the market.' };
    const side = sideOf(state.turn);
    const card = state.deck.pop();
    side.hand.push(card);
    noteDeckEmpty();
    state.phase = PHASE_MELD;
    log(`${side.title} drew from the deck.`);
    return { ok: true, card };
  }

  /** Meld the cards with the given ids from the current side's hand. One meld a turn. */
  function playMeld(cardIds) {
    if (state.phase !== PHASE_MELD) return { ok: false, message: 'Meld after taking a card.' };
    if (state.meldedThisTurn) return { ok: false, message: 'One meld per turn.' };
    const side = sideOf(state.turn);
    const cards = [];
    for (const id of cardIds) {
      const card = side.hand.find((c) => c.id === id);
      if (!card) return { ok: false, message: 'Card not in hand.' };
      cards.push(card);
    }
    const meld = classifyMeld(cards);
    if (!meld) return { ok: false, message: 'Those cards make no meld.' };
    side.hand = side.hand.filter((c) => !cardIds.includes(c.id));
    side.melds.push({ cards, kind: meld.kind, points: meld.points });
    side.score += meld.points;
    side.meldCount += 1;
    side.bestMeld = Math.max(side.bestMeld, meld.points);
    state.meldedThisTurn = true;
    state.lastPlay = { side: state.turn, cards, kind: meld.kind, points: meld.points };
    const kindLabel = meld.kind === 'trio' ? 'Trio' : meld.kind === 'run3' ? 'Run of 3' : meld.kind === 'set3' ? 'Set of 3' : meld.kind === 'quad' ? 'Quartet' : 'Run of 4';
    log(`${side.title} melded a ${kindLabel} for ${meld.points} points.`);
    checkTarget(side);
    state.phase = side.hand.length > HAND_LIMIT ? PHASE_DISCARD : PHASE_MELD;
    return { ok: true, meld };
  }

  /** Discard a card to the pile. Only when the hand is over the limit. */
  function discard(cardId) {
    if (state.phase !== PHASE_DISCARD) return { ok: false, message: 'No discard needed.' };
    const side = sideOf(state.turn);
    const index = side.hand.findIndex((c) => c.id === cardId);
    if (index === -1) return { ok: false, message: 'Card not in hand.' };
    const [card] = side.hand.splice(index, 1);
    state.discard.push(card);
    log(`${side.title} discarded ${cardName(card)}.`);
    if (side.hand.length > HAND_LIMIT) return { ok: true, card };
    state.phase = PHASE_MELD;
    return { ok: true, card };
  }

  /** Skip the meld step and end the turn. */
  function endTurn() {
    if (state.phase === PHASE_OVER) return { ok: false, message: 'The festival is over.' };
    if (state.phase === PHASE_DISCARD) return { ok: false, message: 'Discard down to 7 cards first.' };
    if (state.phase === PHASE_TAKE) return { ok: false, message: 'Take a card first.' };
    if (sideOf(state.turn).hand.length > HAND_LIMIT) return { ok: false, message: 'Discard down to 7 cards first.' };
    state.ply += 1;
    state.meldedThisTurn = false;
    if (state.finale && state.turn === state.finale.rival) {
      finishByScore();
      return { ok: true };
    }
    if (state.endPly !== null && state.ply >= state.endPly && !state.finale) {
      finishByScore();
      return { ok: true };
    }
    state.turn = state.turn === SIDE_PLAYER ? SIDE_AI : SIDE_PLAYER;
    if (state.turn === SIDE_PLAYER) state.round += 1;
    state.phase = PHASE_TAKE;
    if (state.turn === SIDE_AI) {
      autoplayTurn(SIDE_AI);
    }
    return { ok: true };
  }

  /** Score one market card for the side that might take it. */
  function marketCardValue(card, side) {
    const trial = [...side.hand, card];
    const meld = bestMeld(trial);
    let value = meld ? meld.points : 0;
    if (meld) value += 4; // completing a meld now beats holding out
    const sameSuit = side.hand.filter((c) => !c.wild && c.suit === card.suit).length;
    const sameValue = side.hand.filter((c) => !c.wild && c.value === card.value).length;
    value += sameSuit * 1.2 + sameValue * 1.0;
    if (card.wild) value += 2.5;
    // Denial: take the suit the other side just melded, so they cannot extend it.
    const other = side === player ? ai : player;
    const last = other.melds[other.melds.length - 1];
    if (last && !card.wild && last.cards.some((c) => !c.wild && c.suit === card.suit)) value += 1.5;
    return value;
  }

  /** One full turn for `side`: take, meld if possible, discard if needed, end turn. */
  function autoplayTurn(side) {
    const me = sideOf(side);
    // Take: the best market card, or a blind draw when nothing beats the baseline.
    let bestIndex = -1;
    let bestValue = DRAW_BASELINE;
    for (let i = 0; i < state.market.length; i += 1) {
      const value = marketCardValue(state.market[i], me);
      if (value > bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    }
    if (bestIndex >= 0) takeMarket(bestIndex);
    else {
      const drew = takeDeck();
      if (!drew.ok) {
        // The deck is dry: take the best market card even if it is ordinary.
        let fallback = -1;
        let fallbackValue = -Infinity;
        for (let i = 0; i < state.market.length; i += 1) {
          const value = marketCardValue(state.market[i], me);
          if (value > fallbackValue) {
            fallbackValue = value;
            fallback = i;
          }
        }
        if (fallback >= 0) takeMarket(fallback);
      }
    }
    if (state.phase === PHASE_OVER) return;
    const meld = bestMeld(me.hand);
    if (meld) playMeld(meld.cards.map((c) => c.id));
    if (state.phase === PHASE_OVER) return;
    while (me.hand.length > HAND_LIMIT) {
      state.phase = PHASE_DISCARD;
      let worst = me.hand[0];
      let worstScore = Infinity;
      for (const card of me.hand) {
        const score = cardUsefulness(card, me.hand) * 10 + card.value * 0.1;
        if (score < worstScore) {
          worstScore = score;
          worst = card;
        }
      }
      discard(worst.id);
    }
    endTurn();
  }

  /** The suit Madame Lumen is collecting most — the tell the player can read. */
  function aiIntent() {
    const counts = {};
    for (const card of ai.hand) {
      if (card.wild) continue;
      counts[card.suit] = (counts[card.suit] || 0) + 1;
    }
    let bestSuit = null;
    let bestCount = 0;
    for (const suit of SUIT_KEYS) {
      if ((counts[suit] || 0) > bestCount) {
        bestCount = counts[suit] || 0;
        bestSuit = suit;
      }
    }
    if (!bestSuit || bestCount < 2) return null;
    return { suit: bestSuit, count: bestCount, label: SUITS[bestSuit].name };
  }

  /** Melds the current side could play right now, best first (for hints). */
  function availableMelds() {
    return findMelds(sideOf(state.turn).hand);
  }

  reset();
  return {
    state, reset, takeMarket, takeDeck, playMeld, discard, endTurn,
    autoplayTurn, aiIntent, availableMelds, marketCardValue,
  };
}
