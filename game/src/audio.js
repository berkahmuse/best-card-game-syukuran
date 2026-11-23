// Tiny synthesized sounds (WebAudio, no assets): a chime when a meld lands, a soft
// tick when a card is taken, a low bell when the festival ends. Silent until the first
// user gesture, and never required for play.
export function createAudio() {
  let context = null;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      return null;
    }
    return context;
  }

  function tone(frequency, start, duration, type, gainValue) {
    const ctx = ensure();
    if (!ctx) return;
    try {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(gainValue, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(ctx.currentTime + start);
      oscillator.stop(ctx.currentTime + start + duration + 0.05);
    } catch {
      // Sound is garnish; a failure here must never break the game.
    }
  }

  return {
    unlock() {
      ensure();
    },
    take() {
      tone(520, 0, 0.12, 'triangle', 0.08);
    },
    meld() {
      tone(523, 0, 0.18, 'sine', 0.12);
      tone(659, 0.07, 0.18, 'sine', 0.12);
      tone(784, 0.14, 0.3, 'sine', 0.14);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.4, 'sine', 0.14));
    },
    lose() {
      tone(392, 0, 0.35, 'sine', 0.1);
      tone(311, 0.15, 0.5, 'sine', 0.1);
    },
  };
}
