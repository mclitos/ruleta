const FANFARE_NOTES = [523.25, 659.25, 783.99, 1046.5];
const CHORD_NOTES = [523.25, 659.25, 783.99, 1046.5, 1318.51];

/**
 * Tiny Web Audio synth: every effect is generated at runtime, so the bundle
 * ships without audio assets and works offline inside the container.
 */
export function createSynth() {
  let ctx = null;
  let master = null;
  let noiseBuffer = null;

  function ensureContext() {
    if (!ctx) {
      const AudioCtx =
        typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 0.7;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.knee.value = 24;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      master.connect(compressor);
      compressor.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function getNoise(context) {
    if (!noiseBuffer) {
      const length = Math.floor(context.sampleRate * 0.5);
      noiseBuffer = context.createBuffer(1, length, context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return noiseBuffer;
  }

  function tone(context, { frequency, start, duration, type = 'triangle', peak = 0.18 }) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  function tick(strength = 1) {
    const context = ensureContext();
    if (!context) return;
    try {
      const now = context.currentTime;
      const source = context.createBufferSource();
      source.buffer = getNoise(context);
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2300 + Math.random() * 1600;
      filter.Q.value = 2.4;
      const gain = context.createGain();
      const peak = Math.max(0.02, 0.4 * strength);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start(now, 0.05 + Math.random() * 0.3, 0.1);
    } catch {
      /* a failed click must never break the raffle */
    }
  }

  function click() {
    const context = ensureContext();
    if (!context) return;
    try {
      const now = context.currentTime;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.05);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.07, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      /* noop */
    }
  }

  function whoosh() {
    const context = ensureContext();
    if (!context) return;
    try {
      const now = context.currentTime;
      const source = context.createBufferSource();
      source.buffer = getNoise(context);
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 0.9;
      filter.frequency.setValueAtTime(260, now);
      filter.frequency.exponentialRampToValueAtTime(3400, now + 0.55);
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start(now, 0, 0.62);
    } catch {
      /* noop */
    }
  }

  function fanfare() {
    const context = ensureContext();
    if (!context) return;
    try {
      const start = context.currentTime + 0.03;
      FANFARE_NOTES.forEach((frequency, index) => {
        tone(context, {
          frequency,
          start: start + index * 0.085,
          duration: 0.42,
          type: 'triangle',
          peak: 0.2,
        });
        tone(context, {
          frequency: frequency * 2,
          start: start + index * 0.085,
          duration: 0.22,
          type: 'sine',
          peak: 0.05,
        });
      });

      const chordStart = start + 0.4;
      CHORD_NOTES.forEach((frequency) => {
        tone(context, {
          frequency,
          start: chordStart,
          duration: 1.15,
          type: 'triangle',
          peak: 0.085,
        });
      });
      tone(context, {
        frequency: 130.81,
        start: chordStart,
        duration: 0.7,
        type: 'sine',
        peak: 0.14,
      });

      const source = context.createBufferSource();
      source.buffer = getNoise(context);
      const filter = context.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 5200;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, chordStart);
      gain.gain.exponentialRampToValueAtTime(0.1, chordStart + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, chordStart + 0.75);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start(chordStart, 0, 0.8);
    } catch {
      /* noop */
    }
  }

  function setVolume(value) {
    const normalized = Math.min(Math.max(value, 0), 1);
    if (master && ctx) {
      master.gain.setTargetAtTime(normalized, ctx.currentTime, 0.05);
    }
  }

  return {
    setVolume,
    tick,
    click,
    whoosh,
    fanfare,
    resume: ensureContext,
  };
}
