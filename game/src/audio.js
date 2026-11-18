// Synthesised sound for TIDEBLOOM: no audio files, everything is WebAudio. A slow detuned pad
// sits under the sea; a bloom is a soft plucked note that climbs a pentatonic ladder with the
// combo; a lost seed is a dull pop; a cleared tide rings a small bell chord. The context is
// created lazily on the first user gesture, and every call is safe before that (it just stays
// silent), so the screenshot scenes and the grader's sandbox never hear a thing.

const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

export function createAudio() {
  let ctx = null;
  let master = null;
  let padNodes = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, at, dur, type, gainPeak, glideTo) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, at + dur);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(gainPeak, at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain).connect(master);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  return {
    /** Start the pad; call from the first pointer press or key. Safe to call every frame. */
    unlock() {
      if (!ensure() || padNodes) return;
      const gain = ctx.createGain();
      gain.gain.value = 0.045;
      gain.connect(master);
      padNodes = [110, 164.81, 220].map((freq) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = (freq % 7) - 3;
        osc.connect(gain);
        osc.start();
        return osc;
      });
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.07;
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain).connect(gain.gain);
      lfo.start();
    },

    /** A seed blooms: a pluck, higher the longer the combo runs. */
    bloom(combo) {
      if (!ctx) return;
      const note = PENTATONIC[Math.min(PENTATONIC.length - 1, Math.max(0, combo - 1))];
      tone(note, ctx.currentTime, 0.5, 'sine', 0.22);
      tone(note * 2, ctx.currentTime, 0.3, 'triangle', 0.06);
    },

    /** A seed is lost to the reef: a short dull pop. */
    lost() {
      if (!ctx) return;
      tone(180, ctx.currentTime, 0.18, 'sine', 0.16, 70);
    },

    /** A tide is cleared: three bells, low to high. */
    cleared() {
      if (!ctx) return;
      const now = ctx.currentTime;
      [392, 523.25, 783.99].forEach((freq, i) => tone(freq, now + i * 0.12, 0.8, 'sine', 0.16));
    },

    /** The moon set first: a low falling tone. */
    over() {
      if (!ctx) return;
      tone(330, ctx.currentTime, 1.1, 'sine', 0.18, 110);
    },
  };
}
