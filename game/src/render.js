// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the
// backdrop colour. Night-market palette: deep indigo felt, lantern gold, five suits
// told apart by colour AND shape, never by text alone.
import { CARD, CARD_MINI, FIELD, FONT, PALETTE, SUITS, TARGET_SCORE } from './config.js';
import { SIDE_AI, SIDE_PLAYER } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const MARKET_Y = 195;
const HAND_Y = 544;
const DECK_POS = { x: 880, y: MARKET_Y };
const DISCARD_POS = { x: 1010, y: MARKET_Y };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawGlyph(ctx, glyph, cx, cy, size, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.lineCap = 'round';
  if (glyph === 'moon') {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.5, Math.PI * 0.35, Math.PI * 1.65);
    ctx.arc(size * 0.22, -size * 0.12, size * 0.42, Math.PI * 1.55, Math.PI * 0.45, true);
    ctx.closePath();
    ctx.fill();
  } else if (glyph === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const r = i % 2 === 0 ? size * 0.55 : size * 0.24;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else if (glyph === 'wave') {
    ctx.beginPath();
    for (let row = -1; row <= 1; row += 1) {
      const y = row * size * 0.28;
      ctx.moveTo(-size * 0.5, y);
      for (let t = 0; t <= 8; t += 1) {
        ctx.lineTo(-size * 0.5 + (t / 8) * size, y + Math.sin((t / 8) * Math.PI * 2) * size * 0.12);
      }
    }
    ctx.stroke();
  } else if (glyph === 'leaf') {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.5);
    ctx.bezierCurveTo(size * 0.5, -size * 0.2, size * 0.45, size * 0.35, 0, size * 0.5);
    ctx.bezierCurveTo(-size * 0.45, size * 0.35, -size * 0.5, -size * 0.2, 0, -size * 0.5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.4);
    ctx.lineTo(0, size * 0.62);
    ctx.stroke();
  } else if (glyph === 'coin') {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbf6e9';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.26, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Festival lantern.
    ctx.fillRect(-size * 0.32, -size * 0.5, size * 0.64, size * 0.1);
    roundRect(ctx, -size * 0.36, -size * 0.38, size * 0.72, size * 0.72, size * 0.16);
    ctx.fill();
    ctx.fillRect(-size * 0.32, size * 0.36, size * 0.64, size * 0.1);
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(-size * 0.36, -size * 0.14);
    ctx.lineTo(size * 0.36, -size * 0.14);
    ctx.moveTo(-size * 0.36, size * 0.1);
    ctx.lineTo(size * 0.36, size * 0.1);
    ctx.stroke();
  }
  ctx.restore();
}

/** Card rectangles and buttons, shared by the renderer and the click handling. */
export function computeLayout(state) {
  const market = [];
  const totalW = 3 * CARD.width + 2 * 18;
  const x0 = (FIELD.width - totalW) / 2 - 120;
  for (let i = 0; i < state.market.length; i += 1) {
    market.push({ x: x0 + i * (CARD.width + 18), y: MARKET_Y, w: CARD.width, h: CARD.height, card: state.market[i] });
  }
  const hand = [];
  const n = state.player.hand.length;
  const spacing = n <= 1 ? 0 : Math.min(122, 700 / Math.max(1, n - 1));
  const handW = n <= 1 ? CARD.width : CARD.width + spacing * (n - 1);
  const hx0 = 330 + (730 - handW) / 2;
  for (let i = 0; i < n; i += 1) {
    hand.push({ x: hx0 + i * spacing, y: HAND_Y, w: CARD.width, h: CARD.height, card: state.player.hand[i] });
  }
  return {
    market,
    hand,
    deck: { x: DECK_POS.x, y: DECK_POS.y, w: CARD.width, h: CARD.height },
    discard: { x: DISCARD_POS.x, y: DISCARD_POS.y, w: CARD.width, h: CARD.height },
    meldButton: { x: 1080, y: 556, w: 184, h: 56 },
    endButton: { x: 1080, y: 624, w: 184, h: 56 },
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, weight) {
    const key = `${weight || ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight ? `${weight} ` : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.fillText(value, x, y);
  }

  function drawTable() {
    const grad = context.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, '#1d1740');
    grad.addColorStop(1, '#14102a');
    context.fillStyle = grad;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Festival lanterns strung across the top.
    context.strokeStyle = '#3a2d6e';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, 6);
    context.quadraticCurveTo(640, 34, 1280, 6);
    context.stroke();
    const lanternColors = ['#f2c14e', '#b388eb', '#4fc3e8', '#7bc96f', '#ef6f6c'];
    for (let i = 0; i < 9; i += 1) {
      const x = 80 + i * 140;
      const y = 10 + Math.sin((i / 8) * Math.PI) * 14;
      context.fillStyle = lanternColors[i % lanternColors.length];
      context.globalAlpha = 0.9;
      context.beginPath();
      context.arc(x, y + 16, 7, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
    }
    // Table ellipse.
    context.fillStyle = PALETTE.table;
    context.beginPath();
    context.ellipse(640, 400, 560, 250, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.feltEdge;
    context.lineWidth = 3;
    context.stroke();
  }

  function drawCardBack(x, y, w, h) {
    roundRect(context, x, y, w, h, 8);
    context.fillStyle = PALETTE.cardBack;
    context.fill();
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 2;
    context.stroke();
    roundRect(context, x + 6, y + 6, w - 12, h - 12, 6);
    context.strokeStyle = 'rgba(242,193,78,0.5)';
    context.lineWidth = 1;
    context.stroke();
    drawGlyph(context, 'lantern', x + w / 2, y + h / 2, Math.min(w, h) * 0.42, PALETTE.gold);
  }

  function drawCard(card, x, y, w, h, selected, dimmed) {
    const suit = card.wild ? null : SUITS[card.suit];
    context.save();
    if (dimmed) context.globalAlpha = 0.45;
    roundRect(context, x, y, w, h, CARD.radius);
    context.fillStyle = PALETTE.cardFace;
    context.fill();
    if (selected) {
      context.strokeStyle = PALETTE.gold;
      context.lineWidth = 4;
      context.stroke();
      context.shadowColor = PALETTE.gold;
      context.shadowBlur = 18;
      roundRect(context, x, y, w, h, CARD.radius);
      context.stroke();
      context.shadowBlur = 0;
    } else {
      context.strokeStyle = suit ? suit.color : PALETTE.gold;
      context.lineWidth = 2;
      context.stroke();
    }
    // Header band: suit colour, glyph and name.
    context.fillStyle = suit ? suit.color : PALETTE.gold;
    roundRect(context, x, y, w, 30, CARD.radius);
    context.fill();
    context.fillRect(x, y + 18, w, 12);
    drawGlyph(context, suit ? suit.glyph : 'lantern', x + 16, y + 15, 18, '#fff');
    text(suit ? suit.name : 'FESTIVAL', x + 28, y + 20, 13, '#fff', 'left', '700');
    // Big value, suit glyph, and name.
    context.textBaseline = 'alphabetic';
    if (card.wild) {
      drawGlyph(context, 'lantern', x + w / 2, y + 78, 52, '#8a6d1f');
      text('WILD', x + w / 2, y + 128, 20, PALETTE.cardInk, 'center', '800');
      text('any card', x + w / 2, y + 146, 12, '#6b6390', 'center');
    } else {
      text(String(card.value), x + w / 2, y + 96, 54, PALETTE.cardInk, 'center', '800');
      drawGlyph(context, suit.glyph, x + w / 2, y + 122, 26, suit.color);
      text(`${suit.name} ${card.value}`, x + w / 2, y + 146, 12, '#6b6390', 'center');
    }
    context.restore();
  }

  function drawMiniCard(card, x, y) {
    const suit = card.wild ? null : SUITS[card.suit];
    roundRect(context, x, y, CARD_MINI.width, CARD_MINI.height, CARD_MINI.radius);
    context.fillStyle = PALETTE.cardFace;
    context.fill();
    context.strokeStyle = suit ? suit.color : PALETTE.gold;
    context.lineWidth = 1.5;
    context.stroke();
    context.fillStyle = suit ? suit.color : PALETTE.gold;
    context.fillRect(x, y, CARD_MINI.width, 12);
    if (card.wild) {
      text('★', x + CARD_MINI.width / 2, y + 42, 22, '#8a6d1f', 'center', '800');
    } else {
      text(String(card.value), x + CARD_MINI.width / 2, y + 40, 24, PALETTE.cardInk, 'center', '800');
      drawGlyph(context, suit.glyph, x + CARD_MINI.width / 2, y + 54, 13, suit.color);
    }
  }

  function drawScoreBar(x, y, w, score, label) {
    text(label, x, y - 8, 15, PALETTE.muted, 'left', '700');
    roundRect(context, x, y, w, 18, 9);
    context.fillStyle = '#0e0a20';
    context.fill();
    const fill = Math.min(1, score / TARGET_SCORE);
    if (fill > 0) {
      roundRect(context, x, y, Math.max(18, w * fill), 18, 9);
      context.fillStyle = PALETTE.gold;
      context.fill();
    }
    for (let tick = 10; tick < TARGET_SCORE; tick += 10) {
      context.fillStyle = 'rgba(246,239,221,0.5)';
      context.fillRect(x + (w * tick) / TARGET_SCORE - 1, y + 3, 2, 12);
    }
    text(`${score} / ${TARGET_SCORE}`, x + w, y + 15, 16, PALETTE.text, 'right', '800');
  }

  function drawPanel(x, y, w, h, title) {
    roundRect(context, x, y, w, h, 12);
    context.fillStyle = PALETTE.panel;
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 1.5;
    context.stroke();
    if (title) text(title, x + 14, y + 24, 15, PALETTE.gold, 'left', '800');
  }

  function drawMeldChips(x, y, w, title, melds) {
    text(title, x, y, 14, PALETTE.muted, 'left', '700');
    if (melds.length === 0) {
      text('No melds yet', x, y + 26, 13, '#6b6390', 'left');
      return;
    }
    let cx = x;
    let cy = y + 8;
    for (const meld of melds) {
      const kindLabel = meld.kind === 'trio' ? 'Trio' : meld.kind === 'run3' ? 'Run 3' : meld.kind === 'set3' ? 'Set 3' : meld.kind === 'quad' ? 'Quartet' : 'Run 4';
      const label = `${kindLabel} +${meld.points}`;
      const cw = 16 + label.length * 7.5;
      if (cx + cw > x + w) {
        cx = x;
        cy += 30;
      }
      roundRect(context, cx, cy, cw, 24, 12);
      const first = meld.cards.find((c) => !c.wild);
      context.fillStyle = first ? SUITS[first.suit].color : PALETTE.gold;
      context.fill();
      text(label, cx + 8, cy + 17, 13, '#241c3a', 'left', '700');
      cx += cw + 8;
    }
  }

  function drawTableScene(state, ui) {
    const layout = computeLayout(state);
    // AI panel (top left).
    drawPanel(16, 8, 300, 84, 'MADAME LUMEN  •  RIVAL');
    drawScoreBar(30, 56, 190, state.ai.score, '');
    text(`Melds ${state.ai.meldCount}`, 232, 72, 13, PALETTE.muted, 'left');
    const intent = ui.intent;
    text(
      intent ? `Collecting: ${intent.label} ×${intent.count}` : 'Watching the market…',
      30, 84, 13, intent ? PALETTE.gold : PALETTE.muted, 'left',
    );
    // AI hand, face down, top centre.
    const aiN = state.ai.hand.length;
    const aiW = aiN * CARD_MINI.width + (aiN - 1) * 8;
    const aiX0 = 640 - aiW / 2;
    for (let i = 0; i < aiN; i += 1) {
      drawCardBack(aiX0 + i * (CARD_MINI.width + 8), 14, CARD_MINI.width, CARD_MINI.height);
    }
    text(`Rival hand ${aiN}  •  Deck ${state.deck.length}`, 640, 96, 13, PALETTE.muted, 'center');
    // Turn banner.
    const yourTurn = state.turn === SIDE_PLAYER;
    const phaseText = state.phase === 'take' ? 'take a card' : state.phase === 'meld' ? 'meld or end turn' : state.phase === 'discard' ? 'discard to 7' : '';
    text(
      state.phase === 'over' ? 'Festival over' : `ROUND ${state.round}  •  ${yourTurn ? 'YOUR MOVE — ' + phaseText : 'Madame Lumen is thinking…'}`,
      640, 124, 18, yourTurn ? PALETTE.gold : PALETTE.muted, 'center', '800',
    );
    // AI melds (left, under her panel).
    drawMeldChips(16, 118, 300, "LUMEN'S MELDS", state.ai.melds);
    // Market.
    text('MARKET — take one card', 454, MARKET_Y - 12, 14, PALETTE.muted, 'left', '700');
    for (let i = 0; i < layout.market.length; i += 1) {
      const slot = layout.market[i];
      const hovered = ui.hover && ui.hover.x >= slot.x && ui.hover.x <= slot.x + slot.w && ui.hover.y >= slot.y && ui.hover.y <= slot.y + slot.h;
      drawCard(slot.card, slot.x, slot.y - (hovered && state.phase === 'take' && state.turn === SIDE_PLAYER ? 8 : 0), slot.w, slot.h, false, false);
    }
    // Deck and discard piles.
    drawCardBack(DECK_POS.x, DECK_POS.y, CARD.width, CARD.height);
    text(`DECK ${state.deck.length}`, DECK_POS.x + CARD.width / 2, DECK_POS.y + CARD.height + 18, 13, PALETTE.muted, 'center', '700');
    if (state.discard.length > 0) {
      drawCard(state.discard[state.discard.length - 1], DISCARD_POS.x, DISCARD_POS.y, CARD.width, CARD.height, false, false);
    } else {
      roundRect(context, DISCARD_POS.x, DISCARD_POS.y, CARD.width, CARD.height, CARD.radius);
      context.strokeStyle = PALETTE.panelEdge;
      context.setLineDash([6, 6]);
      context.lineWidth = 2;
      context.stroke();
      context.setLineDash([]);
    }
    text(`DISCARD ${state.discard.length}`, DISCARD_POS.x + CARD.width / 2, DISCARD_POS.y + CARD.height + 18, 13, PALETTE.muted, 'center', '700');
    // Last meld strip, centre (hidden on the end screen, where the score panel sits).
    if (state.lastPlay && !ui.hideLastMeld) {
      const lp = state.lastPlay;
      const kindLabel = lp.kind === 'trio' ? 'Trio' : lp.kind === 'run3' ? 'Run of 3' : lp.kind === 'set3' ? 'Set of 3' : lp.kind === 'quad' ? 'Quartet' : 'Run of 4';
      text(
        `LAST MELD — ${lp.side === SIDE_PLAYER ? 'You' : 'Madame Lumen'}: ${kindLabel}, +${lp.points} pts`,
        640, 392, 14, PALETTE.gold, 'center', '700',
      );
      const lw = lp.cards.length * (CARD_MINI.width + 6) - 6;
      const lx0 = 640 - lw / 2;
      lp.cards.forEach((card, i) => drawMiniCard(card, lx0 + i * (CARD_MINI.width + 6), 402));
    }
    // Festival log, right side.
    drawPanel(880, 380, 384, 112, 'FESTIVAL LOG');
    state.log.slice(-4).forEach((line, i) => {
      text(line.length > 52 ? line.slice(0, 52) + '…' : line, 894, 420 + i * 18, 12.5, PALETTE.muted, 'left');
    });
    // Player melds (left, above the player panel).
    drawMeldChips(16, 452, 300, 'YOUR MELDS', state.player.melds);
    // Player panel (bottom left).
    drawPanel(16, 540, 280, 164, 'YOU');
    drawScoreBar(30, 592, 190, state.player.score, '');
    text(`Melds ${state.player.meldCount}  •  Best +${state.player.bestMeld}`, 30, 622, 13, PALETTE.muted, 'left');
    text(`Hand ${state.player.hand.length} / 7`, 30, 646, 13, PALETTE.muted, 'left');
    text('1–7 select • M meld • E end turn', 30, 682, 12, '#6b6390', 'left');
    // Player hand.
    for (let i = 0; i < layout.hand.length; i += 1) {
      const slot = layout.hand[i];
      const selected = ui.selected && ui.selected.has(slot.card.id);
      const hovered = ui.hover && ui.hover.x >= slot.x && ui.hover.x <= slot.x + slot.w && ui.hover.y >= slot.y && ui.hover.y <= slot.y + slot.h;
      drawCard(slot.card, slot.x, slot.y - (selected ? 18 : hovered ? 8 : 0), slot.w, slot.h, selected, false);
    }
    // Buttons.
    const canMeld = ui.canMeld;
    const canEnd = state.phase !== 'take' && state.phase !== 'discard' && state.turn === SIDE_PLAYER;
    drawButton(layout.meldButton, 'MELD  [M]', canMeld);
    drawButton(layout.endButton, 'END TURN  [E]', canEnd);
    if (ui.hint) text(ui.hint, 1172, 540, 13, PALETTE.accent, 'center', '700');
    // Finale / deck-empty warning.
    if (state.finale && state.phase !== 'over') {
      text(`FINALE — ${state.finale.leader} reached ${TARGET_SCORE}! One last turn to catch up.`, 640, 480, 15, PALETTE.accent, 'center', '700');
    } else if (state.endPly !== null && state.phase !== 'over') {
      text('Final turns — the deck is empty!', 640, 480, 15, PALETTE.accent, 'center', '700');
    }
  }

  function drawButton(rect, label, enabled) {
    roundRect(context, rect.x, rect.y, rect.w, rect.h, 12);
    context.fillStyle = enabled ? PALETTE.button : '#3a3358';
    context.fill();
    context.strokeStyle = enabled ? '#fff3c4' : PALETTE.panelEdge;
    context.lineWidth = 2;
    context.stroke();
    text(label, rect.x + rect.w / 2, rect.y + 35, 18, enabled ? PALETTE.buttonInk : '#8b93a3', 'center', '800');
  }

  function drawTitle(state, best) {
    drawTableScene(state, { selected: new Set(), hover: null, intent: null, canMeld: false, hint: '' });
    context.fillStyle = 'rgba(14,10,32,0.82)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Lantern row (below the turn banner, so nothing collides with it).
    for (let i = 0; i < 5; i += 1) {
      const x = 440 + i * 100;
      drawGlyph(context, ['moon', 'star', 'wave', 'leaf', 'coin'][i], x, 172, 64, ['#f2c14e', '#b388eb', '#4fc3e8', '#7bc96f', '#ef6f6c'][i]);
    }
    text('LANTERN ROW', 640, 282, 84, PALETTE.gold, 'center', '900');
    text('Festival of Nine Lights', 640, 328, 30, PALETTE.text, 'center');
    text('A market-draft card game — take lanterns, meld sets and runs,', 640, 378, 19, PALETTE.muted, 'center');
    text('race to 40 points. Reaching 40 starts the finale: one last turn each.', 640, 406, 19, PALETTE.muted, 'center');
    text('Trio 6  •  Run of 3: 10  •  Set of 3: 8  •  Quartet 12  •  Run of 4: 18', 640, 446, 17, PALETTE.text, 'center', '700');
    text('Festival wilds count as any card — and add +3.', 640, 474, 16, PALETTE.accent, 'center');
    text('Click a market card or the deck to take it. Click hand cards, then MELD.', 640, 514, 16, PALETTE.muted, 'center');
    text('Press Space or click to start', 640, 578, 24, PALETTE.gold, 'center', '800');
    if (best > 0) text(`Best score: ${best}`, 640, 618, 16, PALETTE.muted, 'center');
  }

  function drawOver(state, best) {
    drawTableScene(state, { selected: new Set(), hover: null, intent: null, canMeld: false, hint: '', hideLastMeld: true });
    context.fillStyle = 'rgba(14,10,32,0.85)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    const won = state.winner === SIDE_PLAYER;
    const tied = state.winner === 'draw';
    const title = tied ? 'A DEAD HEAT!' : won ? 'THE FESTIVAL IS YOURS!' : 'MADAME LUMEN TAKES THE NIGHT';
    text(title, 640, 210, 52, won ? PALETTE.gold : tied ? PALETTE.text : '#ef9a9a', 'center', '900');
    text(state.reason, 640, 252, 20, PALETTE.muted, 'center');
    text(`${state.player.score}`, 540, 340, 72, PALETTE.text, 'center', '900');
    text('—', 640, 340, 48, PALETTE.muted, 'center');
    text(`${state.ai.score}`, 740, 340, 72, PALETTE.text, 'center', '900');
    text('YOU', 540, 372, 16, PALETTE.muted, 'center', '700');
    text('MADAME LUMEN', 740, 372, 16, PALETTE.muted, 'center', '700');
    text(
      `Melds ${state.player.meldCount} vs ${state.ai.meldCount}  •  Best meld +${Math.max(state.player.bestMeld, state.ai.bestMeld)}  •  ${state.round} rounds`,
      640, 424, 17, PALETTE.text, 'center',
    );
    if (won && state.player.score > best) text('New best score!', 640, 458, 18, PALETTE.gold, 'center', '800');
    else if (best > 0) text(`Best score: ${best}`, 640, 458, 16, PALETTE.muted, 'center');
    text('Press Space or click to play again', 640, 530, 22, PALETTE.gold, 'center', '800');
  }

  function drawPaused() {
    context.fillStyle = 'rgba(14,10,32,0.75)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    text('PAUSED', 640, 330, 56, PALETTE.text, 'center', '900');
    text('The lanterns will wait for you. Press P to resume.', 640, 380, 20, PALETTE.muted, 'center');
  }

  /** Paint one frame: the table, then the screen the game is on. */
  function draw(state, screen, ui, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    context.textBaseline = 'alphabetic';
    drawTable();
    if (screen === SCREEN_TITLE) {
      drawTitle(state, best);
      return;
    }
    if (screen === SCREEN_OVER) {
      drawOver(state, best);
      return;
    }
    drawTableScene(state, ui);
    if (screen === SCREEN_PAUSED) drawPaused();
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
