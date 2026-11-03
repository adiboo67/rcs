// Effets sonores synthétisés avec Web Audio : aucun fichier à charger, ça marche
// même avec une connexion faible dans le train. Le son se débloque au premier
// appui (obligatoire sur iPhone) et peut être coupé depuis l'en-tête.

(function () {
  const KEY = 'rcs_train_sound';
  let ctx = null;
  let master = null;
  let muted = false;
  try { muted = localStorage.getItem(KEY) === 'off'; } catch (e) { /* navigation privée */ }

  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(comp);
    comp.connect(ctx.destination);
    return ctx;
  }

  // Débloque l'audio au premier geste de l'utilisateur.
  function unlock() {
    const c = init();
    if (c && c.state === 'suspended') c.resume();
  }
  ['pointerdown', 'touchstart', 'keydown'].forEach(ev => document.addEventListener(ev, unlock, { passive: true }));

  function ready() {
    return !muted && ctx && ctx.state === 'running';
  }

  // ---------- Briques de base ----------

  function tone(freq, dur, opts) {
    opts = opts || {};
    const t = ctx.currentTime + (opts.delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    if (opts.vibrato) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = opts.vibrato;
      lg.gain.value = opts.depth || freq * 0.04;
      lfo.connect(lg); lg.connect(osc.frequency);
      lfo.start(t); lfo.stop(t + dur + 0.05);
    }
    const vol = opts.vol == null ? 0.3 : opts.vol;
    const a = opts.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = g;
    if (opts.lowpass) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = opts.lowpass;
      g.connect(f); out = f;
    }
    osc.connect(g);
    out.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  let noiseBuf = null;
  function noise(dur, opts) {
    opts = opts || {};
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ctx.currentTime + (opts.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = opts.filter || 'bandpass';
    f.frequency.setValueAtTime(opts.freq || 1000, t);
    if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    f.Q.value = opts.q || 1;
    const g = ctx.createGain();
    const vol = opts.vol == null ? 0.3 : opts.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (opts.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  // Sifflet d'arbitre : son aigu avec un roulement rapide.
  function whistle(dur, delay) {
    tone(2650, dur, { type: 'sine', vibrato: 28, depth: 160, vol: 0.22, attack: 0.02, delay });
    tone(5300, dur, { type: 'sine', vibrato: 28, depth: 300, vol: 0.04, attack: 0.02, delay });
  }

  // ---------- Catalogue des sons ----------

  const SOUNDS = {
    tap() { tone(520, 0.05, { type: 'triangle', vol: 0.12, to: 380 }); },
    tick() { tone(1050, 0.07, { type: 'square', vol: 0.07, lowpass: 3000 }); },
    tickLast() { tone(1400, 0.1, { type: 'square', vol: 0.1, lowpass: 3500 }); },
    ping() { tone(1320, 0.18, { vol: 0.12 }); tone(1980, 0.22, { vol: 0.06, delay: 0.05 }); },
    whoosh() { noise(0.28, { freq: 600, to: 3200, q: 0.8, vol: 0.12, attack: 0.08 }); },
    start() { whistle(0.16, 0); whistle(0.16, 0.24); whistle(0.55, 0.48); },
    whistle() { whistle(0.5, 0); },
    correct() {
      [784, 988, 1319].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.22, delay: i * 0.08 }));
      tone(1568, 0.4, { type: 'sine', vol: 0.12, delay: 0.24 });
    },
    wrong() {
      tone(240, 0.32, { type: 'sawtooth', to: 120, vol: 0.16, lowpass: 900 });
      tone(180, 0.36, { type: 'square', to: 95, vol: 0.08, lowpass: 600, delay: 0.04 });
    },
    timeout() { tone(440, 0.18, { type: 'triangle', vol: 0.14 }); tone(330, 0.3, { type: 'triangle', vol: 0.14, delay: 0.16 }); },
    select() { tone(880, 0.08, { type: 'triangle', vol: 0.14 }); tone(1320, 0.1, { type: 'triangle', vol: 0.1, delay: 0.05 }); },
    turn() { tone(988, 0.16, { vol: 0.22 }); tone(1480, 0.3, { vol: 0.2, delay: 0.12 }); },
    card() { noise(0.12, { filter: 'highpass', freq: 2500, vol: 0.18, attack: 0.005 }); tone(220, 0.06, { type: 'triangle', vol: 0.12, delay: 0.04 }); },
    draw() { noise(0.18, { freq: 1800, to: 900, q: 1.2, vol: 0.14, attack: 0.02 }); },
    reveal() { tone(392, 0.5, { type: 'triangle', to: 784, vol: 0.14 }); noise(0.5, { freq: 500, to: 4000, vol: 0.06, attack: 0.2 }); },
    goal() {
      tone(140, 0.25, { type: 'sine', to: 60, vol: 0.35 });
      noise(1.8, { freq: 900, q: 0.6, vol: 0.28, attack: 0.25 });
      noise(1.6, { freq: 2200, q: 0.9, vol: 0.1, attack: 0.3 });
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { type: 'square', vol: 0.08, lowpass: 2500, delay: 0.25 + i * 0.1 }));
    },
    save() {
      tone(160, 0.2, { type: 'sine', to: 55, vol: 0.4 });
      noise(0.15, { freq: 400, vol: 0.2, delay: 0.01 });
      noise(0.9, { filter: 'lowpass', freq: 700, to: 300, vol: 0.14, attack: 0.15, delay: 0.1 });
    },
    stop() { tone(660, 0.12, { type: 'square', vol: 0.12, lowpass: 2000 }); tone(660, 0.12, { type: 'square', vol: 0.12, lowpass: 2000, delay: 0.16 }); whistle(0.4, 0.3); },
    night() { tone(110, 1.6, { type: 'sine', vol: 0.2, attack: 0.4 }); tone(165, 1.6, { type: 'sine', vol: 0.08, attack: 0.6 }); tone(1760, 0.8, { vol: 0.03, delay: 0.5, attack: 0.2 }); },
    dawn() { [392, 523, 659].forEach((f, i) => tone(f, 0.7, { type: 'triangle', vol: 0.1, attack: 0.15, delay: i * 0.18 })); },
    gavel() { tone(180, 0.1, { type: 'square', to: 90, vol: 0.2, lowpass: 1200 }); noise(0.08, { freq: 1500, vol: 0.2 }); },
    fanfare() {
      const seq = [[523, 0], [659, 0.14], [784, 0.28], [1047, 0.42], [784, 0.62], [1047, 0.76]];
      seq.forEach(([f, d], i) => {
        const long = i === seq.length - 1;
        tone(f, long ? 0.8 : 0.18, { type: 'square', vol: 0.09, lowpass: 2600, delay: d });
        tone(f / 2, long ? 0.8 : 0.18, { type: 'triangle', vol: 0.12, delay: d });
      });
      noise(1.6, { freq: 1000, q: 0.6, vol: 0.12, attack: 0.4, delay: 0.5 });
    },
  };

  function play(name) {
    if (!ready() || !SOUNDS[name]) return;
    try { SOUNDS[name](); } catch (e) { /* audio indisponible */ }
  }

  // Joue un son une seule fois par événement (le rendu peut tourner plusieurs fois).
  const seen = new Set();
  function cue(key, name) {
    if (seen.has(key)) return;
    seen.add(key);
    if (seen.size > 500) seen.clear();
    play(name);
  }

  function setMuted(m) {
    muted = !!m;
    try { localStorage.setItem(KEY, muted ? 'off' : 'on'); } catch (e) { /* navigation privée */ }
    if (!muted) { unlock(); setTimeout(() => play('select'), 30); }
  }

  window.SFX = { play, cue, isMuted: () => muted, setMuted, toggle: () => setMuted(!muted), state: () => (ctx ? ctx.state : 'none') };
})();
