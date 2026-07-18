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
  spawn: () => { beep(240, 0.07, 'triangle', 0.035, 100); beep(480, 0.05, 'sine', 0.02); },
  grab: () => beep(150, 0.05, 'sine', 0.035),
  shoot: () => { beep(920, 0.035, 'square', 0.04, -500); noiseBurst(0.04, 0.035, 4000); },
  shotgun: () => { noiseBurst(0.12, 0.08, 2200); beep(100, 0.1, 'sawtooth', 0.045, -50); },
  hit: () => { noiseBurst(0.05, 0.045, 1800); beep(85, 0.06, 'triangle', 0.035); },
  thwack: () => { beep(65, 0.12, 'sawtooth', 0.055, -25); noiseBurst(0.09, 0.055, 1600); },
  sever: () => { beep(320, 0.16, 'sawtooth', 0.055, -220); noiseBurst(0.14, 0.07, 2400); beep(180, 0.1, 'square', 0.03); },
  explode: () => { noiseBurst(0.28, 0.12, 900); beep(55, 0.35, 'sawtooth', 0.07, -35); beep(40, 0.4, 'sine', 0.04); },
  laser: () => { beep(1400, 0.07, 'sine', 0.03, -700); beep(900, 0.05, 'square', 0.015); },
  zap: () => { beep(1900, 0.045, 'square', 0.03); beep(380, 0.14, 'sawtooth', 0.045, -320); noiseBurst(0.06, 0.03, 5000); },
  flame: () => noiseBurst(0.07, 0.035, 1200),
  chainsaw: () => { beep(85 + Math.random() * 50, 0.05, 'sawtooth', 0.035); noiseBurst(0.045, 0.03, 2000); },
  death: () => { beep(160, 0.28, 'triangle', 0.045, -110); beep(80, 0.4, 'sine', 0.035, -45); noiseBurst(0.1, 0.03, 800); },
  mine: () => { beep(480, 0.05, 'square', 0.03); beep(720, 0.04, 'sine', 0.02); },
};
