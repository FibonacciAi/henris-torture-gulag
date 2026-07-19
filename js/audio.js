/** WebAudio SFX — punchier gulag suite. */

let ctx = null;
let muted = false;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function beep(freq, dur, type = 'square', gain = 0.045, slide = 0) {
  if (muted) return;
  const a = ac();
  const o = a.createOscillator();
  const g = a.createGain();
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 4200;
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), a.currentTime + dur);
  g.gain.setValueAtTime(gain, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(f);
  f.connect(g);
  g.connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur + 0.03);
}

function noiseBurst(dur = 0.12, gain = 0.05, lp = 3000) {
  if (muted) return;
  const a = ac();
  const n = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = n.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource();
  s.buffer = n;
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lp;
  const g = a.createGain();
  g.gain.value = gain;
  s.connect(f);
  f.connect(g);
  g.connect(a.destination);
  s.start();
}

export const sfx = {
  unlock: () => ac(),
  spawn: () => { beep(240, 0.07, 'triangle', 0.045, 120); beep(480, 0.06, 'sine', 0.03); beep(720, 0.04, 'square', 0.015); },
  grab: () => beep(150, 0.05, 'sine', 0.04),
  shoot: () => { beep(920, 0.04, 'square', 0.05, -500); noiseBurst(0.05, 0.04, 4000); },
  shotgun: () => { noiseBurst(0.14, 0.1, 2200); beep(100, 0.12, 'sawtooth', 0.055, -50); },
  hit: () => { noiseBurst(0.06, 0.05, 1800); beep(85, 0.07, 'triangle', 0.04); },
  thwack: () => { beep(65, 0.14, 'sawtooth', 0.065, -25); noiseBurst(0.1, 0.06, 1600); },
  sever: () => { beep(320, 0.18, 'sawtooth', 0.06, -220); noiseBurst(0.15, 0.08, 2400); beep(180, 0.1, 'square', 0.035); },
  explode: () => { noiseBurst(0.32, 0.14, 900); beep(55, 0.4, 'sawtooth', 0.08, -35); beep(40, 0.45, 'sine', 0.05); },
  laser: () => { beep(1400, 0.08, 'sine', 0.035, -700); beep(900, 0.06, 'square', 0.02); },
  zap: () => { beep(1900, 0.05, 'square', 0.04); beep(380, 0.16, 'sawtooth', 0.055, -320); noiseBurst(0.08, 0.04, 5000); },
  flame: () => noiseBurst(0.08, 0.04, 1200),
  chainsaw: () => { beep(85 + Math.random() * 50, 0.06, 'sawtooth', 0.04); noiseBurst(0.05, 0.035, 2000); },
  death: () => { beep(160, 0.3, 'triangle', 0.05, -110); beep(80, 0.42, 'sine', 0.04, -45); noiseBurst(0.12, 0.04, 800); },
  mine: () => { beep(480, 0.06, 'square', 0.035); beep(720, 0.05, 'sine', 0.025); },
};
