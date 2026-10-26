// 天下之道 — 音樂與音效：以 Web Audio 即時合成古箏、太鼓、尺八，不需要任何音檔
window.TAudio = (function () {
  let ctx = null, master, music, sfxBus, noiseBuf, on = false, mood = null, timer = null, nextT = 0, step = 0, bar = 0;
  try { on = localStorage.getItem('tenka.sound') === 'on'; } catch (e) { }

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = .85; master.connect(ctx.destination);
    music = ctx.createGain(); music.gain.value = .3; music.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = .55; sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  // ───── 樂器 ─────
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function koto(freq, t, vel = 1, dest = music) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = freq;
    o2.type = 'sawtooth'; o2.frequency.value = freq * 2.003; g2.gain.value = .12;
    f.type = 'lowpass'; f.frequency.setValueAtTime(freq * 7, t); f.frequency.exponentialRampToValueAtTime(freq * 1.6, t + .9);
    env(g, t, .004, .3 * vel, 1.7);
    o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(dest);
    o.start(t); o2.start(t); o.stop(t + 1.9); o2.stop(t + 1.9);
  }
  function taiko(t, vel = 1, pitch = 72, dest = music) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(pitch, t); o.frequency.exponentialRampToValueAtTime(pitch * .5, t + .3);
    env(g, t, .003, .9 * vel, .55);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + .7);
    noise(t, .07, 'lowpass', 500, .35 * vel, dest);
  }
  function kane(t, vel = 1, dest = music) { // 鉦：小金屬打擊
    noise(t, .05, 'bandpass', 3800, .25 * vel, dest);
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = 2650;
    env(g, t, .002, .04 * vel, .18); o.connect(g); g.connect(dest); o.start(t); o.stop(t + .25);
  }
  function shaku(freq, t, dur, vel = 1, dest = music) {
    const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sine'; o.frequency.setValueAtTime(freq * .97, t); o.frequency.linearRampToValueAtTime(freq, t + .25);
    lfo.frequency.value = 5; lg.gain.value = freq * .012; lfo.connect(lg); lg.connect(o.frequency);
    f.type = 'lowpass'; f.frequency.value = freq * 3;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.16 * vel, t + .35); g.gain.setValueAtTime(.16 * vel, t + dur - .4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(dest); o.start(t); lfo.start(t); o.stop(t + dur + .05); lfo.stop(t + dur + .05);
    noise(t, dur * .6, 'bandpass', freq * 2.2, .025 * vel, dest);
  }
  function noise(t, dur, type, fq, vol, dest = sfxBus) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = fq; f.Q.value = type === 'bandpass' ? 1.4 : .7;
    env(g, t, .003, vol, dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + .05);
  }
  function horn(t, dest = sfxBus) { // 法螺貝
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sawtooth'; o2.type = 'sawtooth';
    o.frequency.setValueAtTime(155, t); o.frequency.linearRampToValueAtTime(175, t + .5); o.frequency.linearRampToValueAtTime(165, t + 1.8);
    o2.frequency.setValueAtTime(311, t); o2.frequency.linearRampToValueAtTime(350, t + .5);
    f.type = 'lowpass'; f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(1100, t + .6); f.frequency.linearRampToValueAtTime(500, t + 2);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.22, t + .3); g.gain.setValueAtTime(.2, t + 1.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(dest); o.start(t); o2.start(t); o.stop(t + 2.3); o2.stop(t + 2.3);
  }

  // 都節音階（陰音階）：D, E♭, G, A, B♭
  const SCALE = [0, 1, 5, 7, 8];
  const note = (deg, oct = 0) => 293.66 * Math.pow(2, (SCALE[((deg % 5) + 5) % 5] + 12 * (oct + Math.floor(deg / 5))) / 12);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // ───── 曲風 ─────
  const MOODS = {
    calm: { bpm: 64, bar(t, s16) {
      const s = s16 * 4;
      if (bar % 2 === 0) koto(note(0, -1), t, .7);
      const pts = pick([[0, 6, 10, 12], [0, 4, 8, 14], [2, 6, 12], [0, 3, 6, 10, 13]]);
      let d = pick([0, 2, 3, 4]);
      pts.forEach(p => { d = Math.max(0, Math.min(9, d + pick([-2, -1, 1, 1, 2]))); koto(note(d), t + p * s16, .55 + Math.random() * .35); });
      if (bar % 4 === 2) shaku(note(pick([2, 3, 4]), 1) / 2, t + 2 * s16, s * 2.6, .9);
    } },
    battle: { bpm: 118, bar(t, s16) {
      const P = bar % 4 === 3 ? [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1] : [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];
      P.forEach((v, i) => { if (v) taiko(t + i * s16, i % 8 === 0 ? 1 : .55, i % 8 === 0 ? 70 : 95); });
      [0, 4, 8, 12].forEach(i => kane(t + i * s16 + s16 * 2, .7));
      const root = bar % 8 < 4 ? 0 : 3;
      [0, 2, 4, 6, 8, 10, 12, 14].forEach((i, k) => koto(note(k % 2 ? root + 2 : root, -1), t + i * s16, .45));
      if (bar % 2 === 1) [0, 3, 6].forEach(i => koto(note(pick([4, 5, 7])), t + (8 + i) * s16, .5));
    } },
    tense: { bpm: 52, bar(t, s16) {
      koto(note(0, -1), t, .6); koto(note(1, -1), t + 8 * s16, .5);
      if (bar % 2 === 0) shaku(note(pick([1, 3, 4])) / 2, t + 4 * s16, s16 * 22, .8);
      if (bar % 4 === 3) taiko(t + 12 * s16, .45, 60);
    } }
  };

  function tick() {
    if (!ctx || !mood) return;
    const m = MOODS[mood], s16 = 60 / m.bpm / 4;
    while (nextT < ctx.currentTime + .25) {
      m.bar(nextT, s16);
      nextT += s16 * 16; bar++;
    }
  }
  function startLoop() {
    if (!ensure() || timer) return;
    nextT = ctx.currentTime + .1; bar = 0;
    timer = setInterval(tick, 80); tick();
  }
  function stopLoop() { clearInterval(timer); timer = null; }

  function play(m) {
    if (mood === m && timer) return;
    mood = m;
    if (!on || !ctx) return;
    stopLoop(); music.gain.cancelScheduledValues(ctx.currentTime);
    music.gain.setValueAtTime(.0001, ctx.currentTime); music.gain.exponentialRampToValueAtTime(.3, ctx.currentTime + 1.2);
    startLoop();
  }
  function setOn(v) {
    on = v;
    try { localStorage.setItem('tenka.sound', v ? 'on' : 'off'); } catch (e) { }
    if (v) { if (ensure()) { ctx.resume(); if (mood) { stopLoop(); startLoop(); } } }
    else { stopLoop(); if (ctx) ctx.suspend(); }
  }
  // 瀏覽器規定必須在使用者互動後才能播放聲音
  function unlock() { if (on && ensure()) { ctx.resume(); if (mood && !timer) startLoop(); } }

  function sfx(name) {
    if (!on || !ensure() || ctx.state !== 'running') return;
    const t = ctx.currentTime + .01;
    switch (name) {
      case 'click': noise(t, .03, 'bandpass', 1800, .12); break;
      case 'gun': noise(t, .25, 'lowpass', 1400, .5); noise(t + .05, .4, 'lowpass', 300, .25); break;
      case 'clash': for (let i = 0; i < 3; i++) noise(t + i * .07, .08, 'bandpass', 2500 + Math.random() * 1500, .25); taiko(t, .5, 90, sfxBus); break;
      case 'horn': horn(t); break;
      case 'win': [0, 2, 4, 7].forEach((d, i) => koto(note(d), t + i * .12, .9, sfxBus)); taiko(t, .8, 70, sfxBus); break;
      case 'lose': koto(note(1, -1), t, .9, sfxBus); koto(note(0, -1), t + .5, .9, sfxBus); taiko(t, .6, 55, sfxBus); break;
      case 'level': [4, 7, 9].forEach((d, i) => koto(note(d), t + i * .09, .7, sfxBus)); kane(t + .3, 1, sfxBus); break;
      case 'stamp': taiko(t, .9, 85, sfxBus); break;
      case 'page': noise(t, .18, 'highpass', 3000, .06); break;
      case 'drum': taiko(t, 1, 68, sfxBus); taiko(t + .35, .7, 68, sfxBus); break;
    }
  }
  return { setOn, isOn: () => on, play, sfx, unlock };
})();
