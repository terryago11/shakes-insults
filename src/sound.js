// Sound and vibration. Sounds are synthesized with the Web Audio API from the recipes in
// config/sound.js (no audio files). Browsers only allow audio after a tap or key press, so the
// audio context is created on the first one (every game sound follows a tap). Everything here is
// optional: if audio or vibration is missing or fails, the game just carries on silently.
(function () {
  "use strict";

  const G = window.InsultGame;
  const cfg = G.sounds;
  const on = { sound: true, vibration: true };
  let ctx = null;
  let noise = null;

  // Called from a user gesture (see the listeners at the bottom).
  function unlock() {
    if (!ctx) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      try {
        ctx = new Audio();
      } catch (e) {
        return;
      }
    }
    if (ctx.state === "suspended") ctx.resume();
  }

  function noiseBuffer() {
    if (!noise) {
      noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return noise;
  }

  function playNote(n, t0) {
    const start = t0 + n.at;
    const end = start + n.dur;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, start);
    const peak = (n.gain === undefined ? 1 : n.gain) * cfg.volume;
    const attackEnd = start + (n.attack === undefined ? 0.008 : n.attack);
    gain.gain.linearRampToValueAtTime(peak, attackEnd);
    if (n.release) gain.gain.setValueAtTime(peak, Math.max(attackEnd, end - n.release)); // hold, then fade over the last `release` seconds
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    let source;
    if (n.noise) {
      source = ctx.createBufferSource();
      source.buffer = noiseBuffer();
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = n.freq;
      filter.Q.value = n.q || 1;
      source.connect(filter);
      filter.connect(gain);
    } else {
      source = ctx.createOscillator();
      source.type = n.wave || "sine";
      source.frequency.setValueAtTime(n.freq, start);
      if (n.to) source.frequency.exponentialRampToValueAtTime(n.to, end);
      if (n.detune) source.detune.value = n.detune;
      if (n.filter) {
        // A low-pass filter that opens quickly: a plain sawtooth then sounds brassy.
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.Q.value = n.filter.q || 1;
        lowpass.frequency.setValueAtTime(n.filter.freq, start);
        if (n.filter.to) lowpass.frequency.exponentialRampToValueAtTime(n.filter.to, start + Math.min(0.08, n.dur));
        source.connect(lowpass);
        lowpass.connect(gain);
      } else {
        source.connect(gain);
      }
    }
    source.start(start);
    source.stop(end + 0.02);
  }

  // Plays a named cue (sound and/or vibration, whichever is switched on and available).
  function cue(name) {
    const c = cfg.cues[name];
    if (!c) throw new Error(`Unknown sound cue: ${name}`);
    if (on.sound && ctx) {
      const play = () => {
        try {
          const t0 = ctx.currentTime + 0.02;
          c.notes.forEach((n) => playNote(n, t0));
        } catch (e) {
          /* audio is a nicety; ignore failures */
        }
      };
      if (ctx.state === "running") play();
      else ctx.resume().then(() => ctx.state === "running" && play(), () => {}); // e.g. Safari starts suspended
    }
    if (on.vibration && canVibrate()) {
      try {
        navigator.vibrate(c.vibrate);
      } catch (e) {
        /* ignore */
      }
    }
  }

  const canVibrate = () => typeof navigator.vibrate === "function";

  G.audio = {
    unlock,
    cue,
    canVibrate,
    set(sound, vibration) {
      on.sound = !!sound;
      on.vibration = !!vibration;
    },
  };

  for (const event of ["click", "keydown", "touchend"]) document.addEventListener(event, unlock, true);
})();
