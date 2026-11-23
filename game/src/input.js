// Keyboard and pointer input. Clicks land as board coordinates in the 1280x720 field;
// one-shot key presses are queued as bit flags and taken once by the loop, so a press
// between two frames is never lost and never counted twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_END_TURN = 4;
export const ACTION_MELD = 8;
export const ACTION_DRAW = 16;
export const ACTION_RESTART = 32;
export const ACTION_HINT = 64;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const END_TURN = new Set(['KeyE']);
const MELD = new Set(['KeyM']);
const DRAW = new Set(['KeyD']);
const RESTART = new Set(['KeyR']);
const HINT = new Set(['KeyH']);

export function createInput(target) {
  let actions = 0;
  const clicks = [];
  let hover = { x: -1, y: -1 };

  function fieldPoint(event) {
    const rect = target.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else if (END_TURN.has(event.code)) actions |= ACTION_END_TURN;
    else if (MELD.has(event.code)) actions |= ACTION_MELD;
    else if (DRAW.has(event.code)) actions |= ACTION_DRAW;
    else if (RESTART.has(event.code)) actions |= ACTION_RESTART;
    else if (HINT.has(event.code)) actions |= ACTION_HINT;
    else if (/^Digit[1-8]$/.test(event.code)) {
      clicks.push({ kind: 'hand', index: Number(event.code.slice(5)) - 1 });
    } else return;
    event.preventDefault();
  });
  target.addEventListener('pointerdown', (event) => {
    const point = fieldPoint(event);
    clicks.push({ kind: 'point', x: point.x, y: point.y });
  });
  target.addEventListener('pointermove', (event) => {
    hover = fieldPoint(event);
  });

  return {
    /** One-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Clicks since the last call: { kind: 'point', x, y } or { kind: 'hand', index }. */
    takeClicks() {
      const taken = clicks.splice(0, clicks.length);
      return taken;
    },
    hover() {
      return hover;
    },
  };
}
