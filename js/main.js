/**
 * Henri's Torture Gulag — physics sandbox (v2 polish).
 */
import { sfx } from './audio.js';
import { createFx } from './fx.js';
import { loadAll } from './assets.js';
import {
  createRagdoll, damagePart, applyImpactDamage, updatePeople, drawPeople, bodyAt, killPerson,
  setSprites,
} from './ragdoll.js';
import { TOOLS, createToolSystem, setToolSprites } from './tools.js';

const { Engine, Bodies, Body, Composite, Constraint, Events, Vector } = Matter;

const canvas = document.getElementById('c');
const ctx2d = canvas.getContext('2d');

const stats = { people: 0, limbs: 0, kills: 0, chaos: 0, bestCombo: 0 };
const people = [];
let SPRITES = null;

// combo + slow-mo
let combo = 0;
let comboTimer = 0;
let timeScale = 1;
let slowMoT = 0;

const ctx = {
  world: null,
  engine: null,
  people,
  stats,
  sfx,
  fx: null,
  tools: null,
  damagePart,
  killPerson,
  pointer: { x: 0, y: 0, dx: 0, dy: 0, down: false, right: false },
  cam: { x: 0, y: 0 },
  zoom: 1,
  W: 800,
  H: 600,
  floorY: 560,
  dt: 0.016,
  shake: 0,
  paused: false,
  grab: null,
  aimAngle: 0,
  toast: null,
  comboMul: () => 1 + Math.min(4, combo * 0.15),
  registerHit: (dealt) => {
    if (dealt < 4) return;
    combo += 1;
    comboTimer = 2.4;
    if (combo > stats.bestCombo) stats.bestCombo = combo;
    syncCombo();
  },
  registerKill: () => {
    combo += 3;
    comboTimer = 2.8;
    if (combo > stats.bestCombo) stats.bestCombo = combo;
    syncCombo();
  },
  triggerSlowMo: (scale = 0.35, dur = 0.5) => {
    timeScale = Math.min(timeScale, scale);
    slowMoT = Math.max(slowMoT, dur);
  },
};

let toastT = 0;
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  toastT = 1.7;
}
ctx.toast = toast;

function syncCombo() {
  const el = document.getElementById('combo');
  if (!el) return;
  if (combo >= 2) {
    el.classList.remove('hidden');
    el.innerHTML = `<b>x${combo}</b><span>COMBO</span>`;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  } else {
    el.classList.add('hidden');
  }
}

// ─── World ───
const engine = Engine.create({
  gravity: { x: 0, y: 1.15 },
  positionIterations: 8,
  velocityIterations: 6,
});
const world = engine.world;
ctx.engine = engine;
ctx.world = world;
ctx.fx = createFx();

const WORLD_W = 2400;
const WORLD_H = 960;
ctx.floorY = WORLD_H - 40;

function buildBounds() {
  const opts = { isStatic: true, label: 'wall', friction: 0.85, restitution: 0.04 };
  const floor = Bodies.rectangle(WORLD_W / 2, WORLD_H - 18, WORLD_W + 400, 44, opts);
  const ceil = Bodies.rectangle(WORLD_W / 2, -50, WORLD_W + 400, 100, opts);
  const left = Bodies.rectangle(-50, WORLD_H / 2, 100, WORLD_H + 300, opts);
  const right = Bodies.rectangle(WORLD_W + 50, WORLD_H / 2, 100, WORLD_H + 300, opts);

  const props = [
    Bodies.rectangle(380, WORLD_H - 100, 200, 22, { ...opts, label: 'prop' }),
    Bodies.rectangle(380, WORLD_H - 150, 18, 80, { ...opts, label: 'prop' }),
    Bodies.rectangle(900, WORLD_H - 78, 70, 70, { ...opts, label: 'prop' }),
    Bodies.rectangle(1300, WORLD_H - 110, 160, 18, { ...opts, label: 'prop', angle: -0.28 }),
    Bodies.rectangle(1650, WORLD_H - 80, 90, 50, { ...opts, label: 'prop' }),
    Bodies.rectangle(1950, WORLD_H - 130, 220, 16, { ...opts, label: 'prop', angle: 0.32 }),
    Bodies.rectangle(600, WORLD_H - 280, 140, 16, { ...opts, label: 'prop' }),
    Bodies.rectangle(1500, WORLD_H - 320, 120, 16, { ...opts, label: 'prop' }),
  ];
  Composite.add(world, [floor, ceil, left, right, ...props]);
}
buildBounds();

Events.on(engine, 'collisionStart', (e) => {
  for (const pair of e.pairs) applyImpactDamage(pair, ctx);
});

// ─── Grab ───
let grabConstraint = null;
let grabBody = null;

ctx.grab = {
  start(x, y) {
    const hit = bodyAt(people, x, y);
    let body = hit?.body;
    if (!body) {
      body = Matter.Query.point(world.bodies, { x, y }).find((b) => b.plugin?.person);
    }
    if (!body) return;
    grabBody = body;
    grabConstraint = Constraint.create({
      pointA: { x, y },
      bodyB: grabBody,
      pointB: { x: x - grabBody.position.x, y: y - grabBody.position.y },
      stiffness: 0.22,
      damping: 0.08,
      length: 0,
    });
    Composite.add(world, grabConstraint);
    sfx.grab();
  },
  move(x, y) {
    if (grabConstraint) {
      // smooth follow for juicier flings
      const a = grabConstraint.pointA;
      a.x += (x - a.x) * 0.65;
      a.y += (y - a.y) * 0.65;
    }
  },
  end() {
    if (!grabConstraint) return;
    if (grabBody && Vector.magnitude(grabBody.velocity) > 10 && grabBody.plugin?.person) {
      const spd = Vector.magnitude(grabBody.velocity);
      damagePart(
        grabBody.plugin.person,
        grabBody.plugin.part,
        Math.min(48, spd * 1.7),
        grabBody.position,
        ctx
      );
      if (spd > 18) ctx.fx.floatText(grabBody.position.x, grabBody.position.y - 20, 'YEET', '#54d3de');
    }
    Composite.remove(world, grabConstraint);
    grabConstraint = null;
    grabBody = null;
  },
  active: () => !!grabConstraint,
};

// ─── Tools UI ───
ctx.tools = createToolSystem(ctx);
let toolIndex = 0;

function setTool(i) {
  toolIndex = ((i % TOOLS.length) + TOOLS.length) % TOOLS.length;
  const t = TOOLS[toolIndex];
  document.getElementById('tool-name').textContent = t.name;
  document.getElementById('tool-desc').textContent = t.desc;
  document.querySelectorAll('.tool-btn').forEach((el, idx) => {
    el.classList.toggle('active', idx === toolIndex);
  });
}

function buildToolbar() {
  const row = document.getElementById('tool-row');
  row.innerHTML = '';
  TOOLS.forEach((t, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tool-btn' + (i === 0 ? ' active' : '');
    btn.innerHTML = `
      <img class="tool-img" src="assets/tools/${t.id}.png" alt="${t.name}" draggable="false" />
      <span class="key">${t.key}</span>`;
    btn.title = `${t.name} (${t.key})`;
    btn.onclick = () => setTool(i);
    row.appendChild(btn);
  });
}

// ─── Spawn ───
function spawnPerson(x, y, quiet = false) {
  sfx.unlock();
  // Spawn standing just above the floor — no long freefall deploy
  const px = x ?? 280 + Math.random() * (WORLD_W - 560);
  const py = y ?? (ctx.floorY - 95 - Math.random() * 20);
  const p = createRagdoll(world, px, py, stats, null);
  people.push(p);
  syncStats();
  if (!quiet) {
    sfx.spawn();
    toast('INMATE DEPLOYED');
    ctx.fx.flash(px, py, 40, 'rgba(84,211,222,0.35)', 0.15);
  }
  return p;
}

function spawnCrowd(n = 6) {
  for (let i = 0; i < n; i++) {
    spawnPerson(350 + i * 110 + Math.random() * 40, ctx.floorY - 95 - Math.random() * 15, true);
  }
  sfx.spawn();
  toast(`INMATES ×${n}`);
}

function clearLab() {
  ctx.grab.end();
  ctx.tools.clear();
  ctx.fx.clearDecals?.();
  for (const person of people) {
    for (const b of Object.values(person.parts)) {
      try { Composite.remove(world, b); } catch {}
    }
    for (const j of person.joints) {
      try { Composite.remove(world, j); } catch {}
    }
  }
  people.length = 0;
  stats.people = 0;
  combo = 0;
  comboTimer = 0;
  syncCombo();
  syncStats();
  toast('GULAG PURGED');
}

function syncStats() {
  document.getElementById('stat-people').textContent = String(people.filter((p) => p.alive).length);
  document.getElementById('stat-limbs').textContent = String(stats.limbs);
  document.getElementById('stat-kills').textContent = String(stats.kills);
  document.getElementById('stat-chaos').textContent = String(stats.chaos);
  const best = document.getElementById('stat-combo');
  if (best) best.textContent = String(stats.bestCombo);
}

// ─── Input ───
const keys = {};
let leftDown = false;
let playing = false;
ctx.zoom = 1;

// Camera: middle-drag (or Alt+left) pans; scroll zooms to cursor. No auto-follow.
let panning = false;
let panLast = null; // {x,y} screen
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;

function resize() {
  const wrap = document.getElementById('stage-wrap');
  const rect = wrap.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * devicePixelRatio);
  canvas.height = Math.floor(rect.height * devicePixelRatio);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  ctx2d.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.W = rect.width;
  ctx.H = rect.height;
  clampCam();
}
window.addEventListener('resize', resize);
resize();

function canvasPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function worldFromPointer() {
  const z = ctx.zoom || 1;
  return {
    x: ctx.pointer.x / z + ctx.cam.x,
    y: ctx.pointer.y / z + ctx.cam.y,
  };
}

function screenCenterWorld() {
  const z = ctx.zoom || 1;
  return {
    x: ctx.cam.x + ctx.W / (2 * z),
    y: ctx.cam.y + ctx.H / (2 * z),
  };
}

function updateAimFromPointer() {
  const w = worldFromPointer();
  const c = screenCenterWorld();
  ctx.aimAngle = Math.atan2(w.y - c.y, w.x - c.x);
  return w;
}

function clampCam() {
  const z = ctx.zoom || 1;
  const viewW = ctx.W / z;
  const viewH = ctx.H / z;
  // Allow a little overscroll, but keep most of the arena visible
  const pad = 120;
  ctx.cam.x = Math.max(-pad, Math.min(WORLD_W - viewW + pad, ctx.cam.x));
  ctx.cam.y = Math.max(-pad, Math.min(WORLD_H - viewH + pad, ctx.cam.y));
}

/** Zoom so the world point under (sx,sy) screen stays fixed. */
function zoomAt(sx, sy, nextZoom) {
  const prev = ctx.zoom;
  const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nextZoom));
  if (Math.abs(next - prev) < 1e-4) return;
  const wx = sx / prev + ctx.cam.x;
  const wy = sy / prev + ctx.cam.y;
  ctx.zoom = next;
  ctx.cam.x = wx - sx / next;
  ctx.cam.y = wy - sy / next;
  clampCam();
  updateAimFromPointer();
}

/** Pan by screen-pixel delta (drag right → world moves right under cursor). */
function panByScreen(dx, dy) {
  const z = ctx.zoom || 1;
  ctx.cam.x -= dx / z;
  ctx.cam.y -= dy / z;
  clampCam();
}

function wantsPan(e) {
  // Middle mouse, or Alt+left, or Space+left
  return e.button === 1 || (e.button === 0 && (e.altKey || keys.Space));
}

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('pointerdown', (e) => {
  if (!playing) return;
  sfx.unlock();
  canvas.setPointerCapture?.(e.pointerId);
  const p = canvasPos(e);
  ctx.pointer.x = p.x;
  ctx.pointer.y = p.y;

  if (wantsPan(e)) {
    panning = true;
    panLast = { x: p.x, y: p.y };
    canvas.style.cursor = 'grabbing';
    return;
  }

  const w = worldFromPointer();
  if (e.button === 2) {
    ctx.pointer.right = true;
    ctx.grab.start(w.x, w.y);
  } else if (e.button === 0) {
    leftDown = true;
    ctx.pointer.down = true;
    if (TOOLS[toolIndex].id === 'hand') ctx.grab.start(w.x, w.y);
    else ctx.tools.use(TOOLS[toolIndex].id, true, true);
  }
});

canvas.addEventListener('pointermove', (e) => {
  const p = canvasPos(e);
  ctx.pointer.dx = p.x - ctx.pointer.x;
  ctx.pointer.dy = p.y - ctx.pointer.y;
  ctx.pointer.x = p.x;
  ctx.pointer.y = p.y;

  if (panning && panLast) {
    panByScreen(p.x - panLast.x, p.y - panLast.y);
    panLast = { x: p.x, y: p.y };
    return;
  }

  const w = updateAimFromPointer();
  if (grabConstraint) ctx.grab.move(w.x, w.y);
});

canvas.addEventListener('pointerup', (e) => {
  if (panning && (e.button === 1 || e.button === 0)) {
    panning = false;
    panLast = null;
    canvas.style.cursor = 'none';
  }
  if (e.button === 2) {
    ctx.pointer.right = false;
    ctx.grab.end();
  }
  if (e.button === 0 && !e.altKey) {
    leftDown = false;
    ctx.pointer.down = false;
    if (TOOLS[toolIndex].id === 'hand') ctx.grab.end();
  }
});

canvas.addEventListener('pointerleave', () => {
  leftDown = false;
  ctx.pointer.down = false;
  panning = false;
  panLast = null;
  ctx.grab.end();
  canvas.style.cursor = 'none';
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (!playing) return;
  // Trackpad + mouse: exponential zoom proportional to delta (smooth, not stepped jumps)
  const sensitivity = e.deltaMode === 1 ? 0.05 : 0.0012; // lines vs pixels
  const factor = Math.exp(-e.deltaY * sensitivity);
  zoomAt(ctx.pointer.x, ctx.pointer.y, ctx.zoom * factor);
}, { passive: false });

window.addEventListener('keydown', (e) => {
  if (keys[e.code]) return;
  keys[e.code] = true;
  if (!playing) {
    if (e.code === 'Space' || e.code === 'Enter') startPlay();
    return;
  }
  sfx.unlock();

  const keyMap = {
    Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4,
    Digit6: 5, Digit7: 6, Digit8: 7, Digit9: 8, Digit0: 9,
    Minus: 10, Equal: 11,
    KeyQ: 12, KeyW: 13, KeyE: 14,
  };
  if (e.code === 'KeyR' && !e.shiftKey) { setTool(15); return; }
  if (e.code === 'KeyR' && e.shiftKey) { clearLab(); return; }
  if (keyMap[e.code] != null) setTool(keyMap[e.code]);
  if (e.code === 'Space') { e.preventDefault(); spawnPerson(); }
  if (e.code === 'KeyC') spawnCrowd(8);
  if (e.code === 'KeyP') togglePause();
  if (e.code === 'Escape') ctx.grab.end();
  if (e.code === 'Tab') {
    e.preventDefault();
    setTool(toolIndex + (e.shiftKey ? -1 : 1));
  }
});

window.addEventListener('keyup', (e) => { keys[e.code] = false; });

function togglePause() {
  ctx.paused = !ctx.paused;
  const btn = document.getElementById('btn-pause');
  if (btn) {
    btn.textContent = ctx.paused ? 'RESUME' : 'PAUSE';
    btn.classList.toggle('active', ctx.paused);
  }
}

document.getElementById('btn-spawn').onclick = () => playing && spawnPerson();
document.getElementById('btn-crowd').onclick = () => playing && spawnCrowd(8);
document.getElementById('btn-clear').onclick = () => playing && clearLab();
document.getElementById('btn-pause').onclick = () => playing && togglePause();
document.getElementById('btn-enter')?.addEventListener('click', startPlay);

// ─── Camera ───
ctx.cam.x = 200;
ctx.cam.y = WORLD_H - 720;

function drawEnvironment(time) {
  const c = ctx2d;
  const bg = SPRITES?.labBg;
  if (bg) {
    const scale = Math.max(WORLD_W / bg.width, (ctx.floorY + 120) / bg.height) * 1.08;
    const bw = bg.width * scale;
    const bh = bg.height * scale;
    const parallax = ctx.cam.x * 0.28;
    let ox = -((parallax % bw) + bw) % bw;
    while (ox < WORLD_W + bw) {
      c.drawImage(bg, ox - ctx.cam.x, ctx.floorY - bh - ctx.cam.y + 28, bw, bh);
      ox += bw - 1;
    }
    // dirty sodium wash — no neon
    const pulse = 0.04 + Math.sin(time * 0.7) * 0.015;
    c.fillStyle = `rgba(180,120,40,${pulse})`;
    c.fillRect(0 - ctx.cam.x, -100 - ctx.cam.y, WORLD_W, ctx.floorY + 100);
    c.fillStyle = 'rgba(12,10,8,0.32)';
    c.fillRect(0 - ctx.cam.x, -100 - ctx.cam.y, WORLD_W, ctx.floorY + 100);
  } else {
    c.fillStyle = '#1a1612';
    c.fillRect(0 - ctx.cam.x, 0 - ctx.cam.y, WORLD_W, WORLD_H);
  }

  c.fillStyle = 'rgba(10,8,6,0.45)';
  c.fillRect(0 - ctx.cam.x, ctx.floorY - ctx.cam.y, WORLD_W, 420);

  // props — rusted iron
  for (const b of world.bodies) {
    if (!b.isStatic || b.label === 'wall') continue;
    if (b.plugin?.mine || b.plugin?.spike) continue;
    if (b.label !== 'prop') continue;
    const x = b.position.x - ctx.cam.x;
    const y = b.position.y - ctx.cam.y;
    const w = b.bounds.max.x - b.bounds.min.x;
    const h = b.bounds.max.y - b.bounds.min.y;
    c.save();
    c.translate(x, y);
    c.rotate(b.angle);
    const g = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    g.addColorStop(0, '#5a4a3a');
    g.addColorStop(0.5, '#3a3028');
    g.addColorStop(1, '#2a2018');
    c.fillStyle = g;
    c.strokeStyle = 'rgba(160,120,60,0.25)';
    c.lineWidth = 1.5;
    c.fillRect(-w / 2, -h / 2, w, h);
    c.strokeRect(-w / 2, -h / 2, w, h);
    c.restore();
  }

  // grimy floor seam
  c.strokeStyle = 'rgba(90,40,30,0.55)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(0 - ctx.cam.x, ctx.floorY - ctx.cam.y);
  c.lineTo(WORLD_W - ctx.cam.x, ctx.floorY - ctx.cam.y);
  c.stroke();
}

function drawVignette() {
  const c = ctx2d;
  const g = c.createRadialGradient(ctx.W / 2, ctx.H / 2, ctx.H * 0.2, ctx.W / 2, ctx.H / 2, ctx.H * 0.85);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  c.fillStyle = g;
  c.fillRect(0, 0, ctx.W, ctx.H);
}

function drawCrosshair() {
  const c = ctx2d;
  const mx = ctx.pointer.x;
  const my = ctx.pointer.y;
  const tool = TOOLS[toolIndex];
  c.save();
  c.translate(mx, my);
  c.strokeStyle = 'rgba(201,162,39,0.9)';
  c.lineWidth = 1.5;
  const r = tool.id === 'hand' ? 14 : 18;
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.moveTo(-r - 4, 0); c.lineTo(-4, 0);
  c.moveTo(4, 0); c.lineTo(r + 4, 0);
  c.moveTo(0, -r - 4); c.lineTo(0, -4);
  c.moveTo(0, 4); c.lineTo(0, r + 4);
  c.stroke();
  if (tool.id !== 'hand' && tool.id !== 'mine' && tool.id !== 'spikes' && tool.id !== 'anvil') {
    const ang = ctx.aimAngle || 0;
    c.strokeStyle = 'rgba(201,162,39,0.28)';
    c.setLineDash([4, 6]);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(Math.cos(ang) * 80, Math.sin(ang) * 80);
    c.stroke();
    c.setLineDash([]);
  }
  c.restore();
}

// ─── Loop ───
let last = performance.now();
let time = 0;

function frame(now) {
  let dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  time += dt;

  // slow-mo recovery
  if (slowMoT > 0) {
    slowMoT -= dt;
    if (slowMoT <= 0) timeScale = 1;
  } else {
    timeScale += (1 - timeScale) * Math.min(1, dt * 4);
  }
  const simDt = dt * timeScale;
  ctx.dt = simDt;

  if (playing && !ctx.paused) {
    // combo decay
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) {
        combo = 0;
        syncCombo();
      }
    }

    // Keyboard pan — arrows only (WASD conflicted with tool hotkeys)
    // Constant screen-space speed so zoom doesn't make pan feel broken
    const screenPan = 700 * dt;
    const z = ctx.zoom || 1;
    if (keys.ArrowLeft) ctx.cam.x -= screenPan / z;
    if (keys.ArrowRight) ctx.cam.x += screenPan / z;
    if (keys.ArrowUp) ctx.cam.y -= screenPan / z;
    if (keys.ArrowDown) ctx.cam.y += screenPan / z;
    // [ ] zoom toward view center (avoids tool hotkey clashes)
    if (keys.BracketRight) zoomAt(ctx.W / 2, ctx.H / 2, ctx.zoom * Math.exp(dt * 1.1));
    if (keys.BracketLeft) zoomAt(ctx.W / 2, ctx.H / 2, ctx.zoom * Math.exp(-dt * 1.1));
    clampCam();

    Engine.update(engine, (1000 / 60) * timeScale);

    if (leftDown && TOOLS[toolIndex].id !== 'hand') {
      ctx.tools.use(TOOLS[toolIndex].id, true, false);
    }
    ctx.tools.update(simDt);
    updatePeople(people, simDt, ctx);
    ctx.fx.update(simDt, ctx.floorY);
  }

  if (ctx.shake > 0) ctx.shake = Math.max(0, ctx.shake - dt * 3.2);

  if (toastT > 0) {
    toastT -= dt;
    if (toastT <= 0) document.getElementById('toast')?.classList.add('hidden');
  }

  // ── draw ──
  const c = ctx2d;
  c.save();
  c.clearRect(0, 0, ctx.W, ctx.H);

  const grd = c.createLinearGradient(0, 0, 0, ctx.H);
  grd.addColorStop(0, '#16120e');
  grd.addColorStop(1, '#0c0a08');
  c.fillStyle = grd;
  c.fillRect(0, 0, ctx.W, ctx.H);

  const z = ctx.zoom || 1;
  // Light shake only — heavy shake + zoom felt nauseating
  const sx = ctx.shake ? (Math.random() - 0.5) * ctx.shake * 4 : 0;
  const sy = ctx.shake ? (Math.random() - 0.5) * ctx.shake * 4 : 0;
  c.translate(sx, sy);
  c.scale(z, z);

  drawEnvironment(time);
  ctx.fx.drawDecals(c, ctx.cam);
  drawPeople(c, people, ctx.cam);
  ctx.tools.draw(c, ctx.cam);
  ctx.fx.draw(c, ctx.cam);

  // grab rope
  if (grabConstraint && grabBody) {
    const ax = grabConstraint.pointA.x - ctx.cam.x;
    const ay = grabConstraint.pointA.y - ctx.cam.y;
    const bx = grabBody.position.x - ctx.cam.x;
    const by = grabBody.position.y - ctx.cam.y;
    c.save();
    c.strokeStyle = 'rgba(201,162,39,0.85)';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(ax, ay);
    c.lineTo(bx, by);
    c.stroke();
    c.fillStyle = '#c9a227';
    c.beginPath();
    c.arc(ax, ay, 6, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  c.restore();

  // screen-space overlays
  drawVignette();
  if (playing) drawCrosshair();

  // slow-mo tint — dirty amber, not magenta neon
  if (timeScale < 0.85) {
    c.fillStyle = `rgba(80,50,20,${(1 - timeScale) * 0.16})`;
    c.fillRect(0, 0, ctx.W, ctx.H);
  }

  if (stats.chaos > 0) {
    const h = document.getElementById('hint');
    if (h) h.style.opacity = '0';
  }

  syncStats();
  requestAnimationFrame(frame);
}

function startPlay() {
  if (playing) return;
  playing = true;
  document.getElementById('title-screen')?.classList.add('hidden');
  document.getElementById('app')?.classList.add('playing');
  sfx.unlock();
  spawnCrowd(5);
  toast("WELCOME TO HENRI'S TORTURE GULAG");
}

// boot
async function boot() {
  const loading = document.getElementById('loading');
  try {
    SPRITES = await loadAll();
    setSprites(SPRITES);
    setToolSprites(SPRITES);
    if (SPRITES.logo) {
      const logoEl = document.getElementById('logo-img');
      if (logoEl) {
        logoEl.src = 'assets/ui/logo.png';
        logoEl.classList.remove('hidden');
      }
      const titleLogo = document.getElementById('title-logo');
      if (titleLogo) {
        titleLogo.src = 'assets/ui/logo.png';
        titleLogo.classList.remove('hidden');
      }
    }
    if (SPRITES.keyart) {
      const ka = document.getElementById('title-keyart');
      if (ka) {
        ka.style.backgroundImage = `url('assets/ui/keyart.jpg')`;
      }
    }
  } catch (err) {
    console.warn('Asset load failed', err);
  }
  buildToolbar();
  setTool(0);
  if (loading) loading.classList.add('hidden');
  document.getElementById('title-screen')?.classList.remove('hidden');
  requestAnimationFrame(frame);
}

boot();
