/**
 * Henri's Torture Gulag — physics sandbox (v3: standing + multi-map).
 */
import { sfx } from './audio.js';
import { createFx } from './fx.js';
import { loadAll } from './assets.js';
import {
  createRagdoll, damagePart, applyImpactDamage, updatePeople, drawPeople, bodyAt, killPerson,
  setSprites, removePerson, ensureCapacity, MAX_INMATES, stunPerson, preventFloorTunnel,
} from './ragdoll.js';
import { TOOLS, createToolSystem, setToolSprites } from './tools.js';
import { MAPS, WORLD_W, WORLD_H, buildMapWorld, getMap, drawMapProps } from './maps.js';

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

// Zoom — desktop a bit tighter; touch starts wider so floor + people fit the stage
const isTouchPrimary = (() => {
  try {
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  } catch {
    return false;
  }
})();
const ZOOM_MIN = isTouchPrimary ? 0.55 : 0.7;
const ZOOM_MAX = isTouchPrimary ? 1.8 : 2.0;
const ZOOM_DEFAULT = isTouchPrimary ? 0.92 : 1.15;
ctx.zoom = ZOOM_DEFAULT;

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
  enableSleeping: true,
});
const world = engine.world;
engine.enableSleeping = true;
ctx.engine = engine;
ctx.world = world;
ctx.fx = createFx();

/** @type {import('./maps.js').MapDef} */
let currentMap = MAPS[0];
let staticBodies = [];

function clearStaticWorld() {
  for (const b of staticBodies) {
    try { Composite.remove(world, b); } catch {}
  }
  staticBodies = [];
  // Also strip any leftover static labeled wall/prop (safety)
  for (const b of [...world.bodies]) {
    if (b.isStatic && (b.label === 'wall' || b.label === 'prop') && !b.plugin?.mine && !b.plugin?.spike && !b.plugin?.anvil) {
      try { Composite.remove(world, b); } catch {}
    }
  }
}

function loadMap(mapId, { quiet = false, keepPeople = false } = {}) {
  const built = buildMapWorld(mapId);
  currentMap = built.map;
  ctx.floorY = built.floorY;
  ctx.currentMap = currentMap;

  clearStaticWorld();
  Composite.add(world, built.bodies);
  staticBodies = built.bodies.slice();

  engine.gravity.y = currentMap.gravity ?? 1.15;

  if (!keepPeople) {
    // purge inmates + tools on map switch
    ctx.grab?.endAll?.();
    ctx.tools?.clear?.();
    ctx.fx?.clearDecals?.();
    for (const person of [...people]) removePerson(world, person, people, stats);
    people.length = 0;
    stats.people = 0;
    combo = 0;
    comboTimer = 0;
    syncCombo();
  }

  // Always re-frame so the floor + spawn cluster are on screen
  focusSpawnCam(true);

  syncMapUI();
  tunePhysics();
  if (!quiet) toast(`MAP: ${currentMap.emoji} ${currentMap.name}`);
}

Events.on(engine, 'collisionStart', (e) => {
  const pairs = e.pairs;
  const limit = people.length > 18 ? 12 : people.length > 12 ? 24 : pairs.length;
  const n = Math.min(pairs.length, limit);
  for (let i = 0; i < n; i++) applyImpactDamage(pairs[i], ctx);
});

// ─── Grab (multi-pointer: one grab per finger/mouse) ───
const activeGrabs = new Map(); // pointerId -> { constraint, body }

// Grabbed-person check for standing AI
ctx.isPersonGrabbed = (person) => {
  for (const g of activeGrabs.values()) {
    if (g.body?.plugin?.person === person) return true;
  }
  return false;
};

function endGrabId(id) {
  const g = activeGrabs.get(id);
  if (!g) return;
  if (g.body && Vector.magnitude(g.body.velocity) > 10 && g.body.plugin?.person) {
    const spd = Vector.magnitude(g.body.velocity);
    const person = g.body.plugin.person;
    stunPerson(person, 1.2 + Math.min(2, spd * 0.05));
    damagePart(
      person,
      g.body.plugin.part,
      Math.min(48, spd * 1.7),
      g.body.position,
      ctx
    );
    if (spd > 18) ctx.fx.floatText(g.body.position.x, g.body.position.y - 20, 'YEET', '#c9a227');
  }
  try { Composite.remove(world, g.constraint); } catch {}
  activeGrabs.delete(id);
}

function endAllGrabs() {
  for (const id of [...activeGrabs.keys()]) endGrabId(id);
}

ctx.grab = {
  start(x, y, pointerId = 'mouse') {
    if (activeGrabs.has(pointerId)) endGrabId(pointerId);
    const hit = bodyAt(people, x, y);
    let body = hit?.body;
    if (!body) {
      body = Matter.Query.point(world.bodies, { x, y }).find((b) => b.plugin?.person);
    }
    if (!body) return false;
    // Don't double-grab same body with two fingers
    for (const g of activeGrabs.values()) {
      if (g.body === body) return false;
    }
    const person = body.plugin?.person;
    if (person) stunPerson(person, 0.5);
    const constraint = Constraint.create({
      pointA: { x, y },
      bodyB: body,
      pointB: { x: x - body.position.x, y: y - body.position.y },
      stiffness: 0.28,
      damping: 0.1,
      length: 0,
    });
    Composite.add(world, constraint);
    activeGrabs.set(pointerId, { constraint, body });
    sfx.grab();
    return true;
  },
  move(x, y, pointerId = 'mouse') {
    const g = activeGrabs.get(pointerId);
    if (!g) return;
    const a = g.constraint.pointA;
    a.x += (x - a.x) * 0.7;
    a.y += (y - a.y) * 0.7;
  },
  end(pointerId = 'mouse') {
    endGrabId(pointerId);
  },
  endAll: endAllGrabs,
  active: () => activeGrabs.size > 0,
  forEach(fn) {
    for (const [id, g] of activeGrabs) fn(id, g);
  },
};

// Build default arena once grab system exists
loadMap('gulag', { quiet: true });

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
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
    });
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      setTool(i);
      sfx.unlock();
    });
    row.appendChild(btn);
  });
}

// ─── Spawn ───
let lastBatchAt = 0;

function spawnPerson(x, y, quiet = false, kindId = null) {
  sfx.unlock();
  ensureCapacity(world, people, stats, 1);
  if (people.length >= MAX_INMATES) {
    if (!quiet) toast(`CAPACITY ${MAX_INMATES} — PURGE OR WAIT`);
    return null;
  }
  const px = x ?? 420 + Math.random() * 900;
  const p = createRagdoll(world, px, y ?? 0, stats, {
    kindId: kindId || undefined,
    floorY: ctx.floorY,
  });
  people.push(p);
  ctx.fx.setLoad?.(people.length);
  tunePhysics();
  syncStats();
  if (!quiet) {
    sfx.spawn();
    const label = `${p.kindEmoji || ''} ${p.kindName || 'INMATE'}`.trim();
    toast(label);
    ctx.fx.floatText?.(px, ctx.floorY - 140, label, p.kind?.labelColor || '#c9a227', 1.1);
    ctx.fx.flash(px, ctx.floorY - 100, 40, 'rgba(180,120,40,0.3)', 0.12);
  }
  return p;
}

function spawnCrowd(n = 8) {
  const now = performance.now();
  if (now - lastBatchAt < 280) {
    toast('COOLING…');
    return;
  }
  lastBatchAt = now;

  if (people.length >= MAX_INMATES) {
    ensureCapacity(world, people, stats, Math.min(n, 8));
  }
  const room = Math.max(0, MAX_INMATES - people.length);
  const count = Math.min(n, room, 8);
  if (count <= 0) {
    toast(`FULL (${MAX_INMATES})`);
    return;
  }
  const baseX = 450 + Math.random() * 500;
  const kinds = [];
  for (let i = 0; i < count; i++) {
    const p = spawnPerson(baseX + i * 100 + Math.random() * 30, null, true);
    if (p?.kindEmoji) kinds.push(p.kindEmoji);
  }
  sfx.spawn();
  const mix = kinds.slice(0, 6).join(' ');
  toast(count < n ? `BATCH ${count}  ${mix}` : `CREW ×${count}  ${mix}`);
  ctx.fx.setLoad?.(people.length);
  tunePhysics();
  focusSpawnCam(false);
}

function tunePhysics() {
  const n = people.length;
  // Keep collision quality high enough that flings don't tunnel the floor.
  // Still scale down a bit under crowd load.
  if (n > 20) {
    engine.positionIterations = 5;
    engine.velocityIterations = 4;
  } else if (n > 12) {
    engine.positionIterations = 6;
    engine.velocityIterations = 5;
  } else {
    engine.positionIterations = 8;
    engine.velocityIterations = 6;
  }
}

function syncMapUI() {
  const label = document.getElementById('map-label');
  if (label) label.textContent = `${currentMap.emoji} ${currentMap.name}`;
  document.querySelectorAll('.map-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.map === currentMap.id);
  });
}

function buildMapPicker() {
  const row = document.getElementById('map-row');
  if (!row) return;
  row.innerHTML = '';
  for (const m of MAPS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'map-btn' + (m.id === currentMap.id ? ' active' : '');
    btn.dataset.map = m.id;
    btn.title = m.blurb;
    btn.innerHTML = `<span class="map-emoji">${m.emoji}</span><span class="map-name">${m.name}</span>`;
    btn.addEventListener('click', () => {
      if (m.id === currentMap.id) return;
      sfx.unlock();
      loadMap(m.id);
      if (playing) spawnCrowd(5);
    });
    row.appendChild(btn);
  }
}

/** Cull long-dead bodies when crowded so BATCH spam stays playable. */
function cullStaleCorpses() {
  if (people.length < MAX_INMATES * 0.7) return;
  const now = performance.now();
  for (let i = people.length - 1; i >= 0; i--) {
    const p = people[i];
    if (!p.alive && p.deadAt && now - p.deadAt > 25000) {
      removePerson(world, p, people, stats);
    }
  }
  ctx.fx.setLoad?.(people.length);
  tunePhysics();
}

function clearLab() {
  ctx.grab.endAll();
  ctx.tools.clear();
  ctx.fx.clearDecals?.();
  for (const person of [...people]) {
    removePerson(world, person, people, stats);
  }
  people.length = 0;
  stats.people = 0;
  combo = 0;
  comboTimer = 0;
  syncCombo();
  tunePhysics();
  ctx.fx.setLoad?.(0);
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

// ─── Input (mouse + multitouch) ───
const keys = {};
let leftDown = false;
let playing = false;

/** Active pointers: id -> { x, y, sx, sy, type, role } */
const pointers = new Map();
let pinchState = null; // { dist, midX, midY, zoom }
let toolPointerId = null; // finger/mouse firing continuous tools
let panPointerId = null; // single-finger middle / alt pan
let panAccum = 0; // drag distance before committing empty-space pan

function resize() {
  const wrap = document.getElementById('stage-wrap');
  if (!wrap) return;
  const rect = wrap.getBoundingClientRect();
  // Prefer visualViewport height on iOS Safari (address bar shows/hides)
  const vv = window.visualViewport;
  let w = rect.width;
  let h = rect.height;
  if (vv && isTouchPrimary) {
    // stage-wrap already accounts for chrome; just don't trust 0 sizes
    w = Math.max(w, 1);
    h = Math.max(h, 1);
  }
  const dpr = Math.min(window.devicePixelRatio || 1, isTouchPrimary ? 1.75 : 2);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.W = w;
  ctx.H = h;
  document.documentElement.classList.toggle('touch-ui', isTouchPrimary);
  if (!playing) focusSpawnCam(false);
  else clampCam();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    resize();
    if (playing) focusSpawnCam(false);
  }, 200);
});
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => resize());
}
// Class early so CSS compact layout applies before first paint measure
document.documentElement.classList.toggle('touch-ui', isTouchPrimary);
resize();

function canvasPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function screenToWorld(sx, sy) {
  const z = ctx.zoom || 1;
  return { x: sx / z + ctx.cam.x, y: sy / z + ctx.cam.y };
}

function worldFromPointer() {
  return screenToWorld(ctx.pointer.x, ctx.pointer.y);
}

function screenCenterWorld() {
  const z = ctx.zoom || 1;
  return {
    x: ctx.cam.x + ctx.W / (2 * z),
    y: ctx.cam.y + ctx.H / (2 * z),
  };
}

function updateAimFromScreen(sx, sy) {
  ctx.pointer.x = sx;
  ctx.pointer.y = sy;
  const w = screenToWorld(sx, sy);
  const c = screenCenterWorld();
  ctx.aimAngle = Math.atan2(w.y - c.y, w.x - c.x);
  return w;
}

function clampCam() {
  const z = ctx.zoom || 1;
  const viewW = Math.max(100, (ctx.W || 900) / z);
  const viewH = Math.max(100, (ctx.H || 600) / z);
  const padX = 80;
  const floorY = ctx.floorY || WORLD_H - 48;
  // Never scroll so far that the floor leaves the frame (that was the "empty sky" bug)
  const minY = floorY - viewH * 0.88;
  const maxY = floorY - viewH * 0.3;
  ctx.cam.x = Math.max(-padX, Math.min(WORLD_W - viewW + padX, ctx.cam.x));
  ctx.cam.y = Math.max(Math.min(minY, maxY), Math.min(Math.max(minY, maxY), ctx.cam.y));
}

/** Put the spawn strip + floor on screen (touch: floor lower third so chrome doesn't clip people). */
function focusSpawnCam(resetZoom = false) {
  if (resetZoom) ctx.zoom = ZOOM_DEFAULT;
  // On short iPad landscape stages, zoom out a bit more so people aren't huge
  if (isTouchPrimary && (ctx.H || 600) < 420) {
    ctx.zoom = Math.min(ctx.zoom, 0.78);
  }
  const z = ctx.zoom || ZOOM_DEFAULT;
  const viewW = Math.max(100, (ctx.W || 900) / z);
  const viewH = Math.max(100, (ctx.H || 600) / z);
  const floorY = ctx.floorY || WORLD_H - 48;
  const focusX = 780;
  const focusY = floorY - 110;
  // Touch: bias floor toward bottom ~28% up from bottom of view
  const yFrac = isTouchPrimary ? 0.62 : 0.55;
  ctx.cam.x = focusX - viewW * 0.4;
  ctx.cam.y = focusY - viewH * yFrac;
  clampCam();
}

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
}

function panByScreen(dx, dy) {
  const z = ctx.zoom || 1;
  ctx.cam.x -= dx / z;
  ctx.cam.y -= dy / z;
  clampCam();
}

function pointerList() {
  return [...pointers.values()];
}

function twoFingerMetrics() {
  const pts = pointerList();
  if (pts.length < 2) return null;
  const a = pts[0];
  const b = pts[1];
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { midX, midY, dist };
}

function beginToolAt(id, sx, sy, button) {
  const w = updateAimFromScreen(sx, sy);
  // Right mouse = grab
  if (button === 2) {
    ctx.grab.start(w.x, w.y, id);
    return;
  }
  // Touch or left: hand tool grabs; other tools fire
  if (TOOLS[toolIndex].id === 'hand') {
    if (ctx.grab.start(w.x, w.y, id)) {
      const rec = pointers.get(id);
      if (rec) rec.role = 'grab';
    } else if (isTouchPrimary) {
      // Empty space — wait for a small drag before panning (avoids accidental camera jumps)
      const rec = pointers.get(id);
      if (rec) {
        rec.role = 'pan-pending';
        rec.lastX = sx;
        rec.lastY = sy;
        panAccum = 0;
      }
    }
  } else {
    toolPointerId = id;
    leftDown = true;
    ctx.pointer.down = true;
    const rec = pointers.get(id);
    if (rec) rec.role = 'tool';
    ctx.tools.use(TOOLS[toolIndex].id, true, true);
  }
}

function endToolAt(id) {
  if (toolPointerId === id) {
    toolPointerId = null;
    leftDown = false;
    ctx.pointer.down = false;
  }
  if (panPointerId === id) panPointerId = null;
  ctx.grab.end(id);
}

// ── pointer events ──
canvas.style.touchAction = 'none';
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('pointerdown', (e) => {
  if (!playing) return;
  e.preventDefault();
  sfx.unlock();
  try { canvas.setPointerCapture(e.pointerId); } catch {}

  const p = canvasPos(e);
  const isTouch = e.pointerType === 'touch';
  pointers.set(e.pointerId, {
    id: e.pointerId,
    x: p.x,
    y: p.y,
    sx: p.x,
    sy: p.y,
    type: e.pointerType || 'mouse',
    button: e.button,
    role: 'pending',
    lastX: p.x,
    lastY: p.y,
  });

  // Middle mouse or Alt+left = pan
  if (e.button === 1 || (e.button === 0 && e.altKey && !isTouch)) {
    pointers.get(e.pointerId).role = 'pan';
    panPointerId = e.pointerId;
    canvas.style.cursor = 'grabbing';
    return;
  }

  // Two+ fingers: pure camera on touch (pinch + pan). Grab-while-pinch was confusing on iPad.
  if (pointers.size >= 2) {
    if (toolPointerId != null) {
      leftDown = false;
      ctx.pointer.down = false;
      toolPointerId = null;
    }
    if (isTouchPrimary) {
      // Drop grabs so camera owns the gesture cleanly
      endAllGrabs();
      const m = twoFingerMetrics();
      if (m) {
        pinchState = { dist: Math.max(m.dist, 12), midX: m.midX, midY: m.midY, zoom: ctx.zoom };
        for (const pt of pointers.values()) pt.role = 'pinch';
      }
      return;
    }
    // Desktop multi-pointer (rare): allow dual grab
    const m = twoFingerMetrics();
    if (m) {
      pinchState = { dist: m.dist, midX: m.midX, midY: m.midY, zoom: ctx.zoom };
      for (const pt of pointers.values()) pt.role = 'pinch';
    }
    const w = screenToWorld(p.x, p.y);
    const hit = bodyAt(people, w.x, w.y);
    if (hit || TOOLS[toolIndex].id === 'hand') {
      if (ctx.grab.start(w.x, w.y, e.pointerId)) {
        pointers.get(e.pointerId).role = 'grab';
      }
    }
    return;
  }

  // Single pointer
  beginToolAt(e.pointerId, p.x, p.y, e.button);
});

canvas.addEventListener('pointermove', (e) => {
  const rec = pointers.get(e.pointerId);
  if (!rec) {
    // hover aim for mouse
    if (e.pointerType === 'mouse') {
      const p = canvasPos(e);
      updateAimFromScreen(p.x, p.y);
    }
    return;
  }
  e.preventDefault();
  const p = canvasPos(e);
  const prevX = rec.x;
  const prevY = rec.y;
  rec.x = p.x;
  rec.y = p.y;

  // Primary aim follows last moved tool/grab finger
  if (rec.role !== 'pinch' || pointers.size < 2) {
    updateAimFromScreen(p.x, p.y);
  }

  // Two-finger pinch + pan (damped zoom so iPad trackpad-ish pinches don't rocket)
  if (pointers.size >= 2 && pinchState) {
    const m = twoFingerMetrics();
    if (m && m.dist > 10) {
      panByScreen(m.midX - pinchState.midX, m.midY - pinchState.midY);
      const raw = m.dist / Math.max(12, pinchState.dist);
      // Soften: only apply a fraction of the scale delta per frame
      const scale = 1 + (raw - 1) * (isTouchPrimary ? 0.55 : 0.85);
      zoomAt(m.midX, m.midY, pinchState.zoom * scale);
      pinchState = { dist: m.dist, midX: m.midX, midY: m.midY, zoom: ctx.zoom };
    }
    if (!isTouchPrimary) {
      for (const [id, pt] of pointers) {
        if (activeGrabs.has(id)) {
          const ww = screenToWorld(pt.x, pt.y);
          ctx.grab.move(ww.x, ww.y, id);
        }
      }
    }
    return;
  }

  // Pending pan — commit after ~14px drag so taps don't nudge the camera
  if (rec.role === 'pan-pending') {
    const dx = p.x - rec.lastX;
    const dy = p.y - rec.lastY;
    panAccum += Math.hypot(dx, dy);
    rec.lastX = p.x;
    rec.lastY = p.y;
    if (panAccum > 14) {
      rec.role = 'pan';
      panPointerId = e.pointerId;
    }
    return;
  }

  // Single-finger pan (empty drag or middle/alt)
  if (rec.role === 'pan' || panPointerId === e.pointerId) {
    panByScreen(p.x - prevX, p.y - prevY);
    rec.lastX = p.x;
    rec.lastY = p.y;
    return;
  }

  // Grab follow
  if (activeGrabs.has(e.pointerId) || rec.role === 'grab') {
    const w = screenToWorld(p.x, p.y);
    ctx.grab.move(w.x, w.y, e.pointerId);
  }
});

function releasePointer(e) {
  const id = e.pointerId;
  endToolAt(id);
  pointers.delete(id);

  if (pointers.size < 2) pinchState = null;

  // If one finger remains after pinch, reassign aim
  if (pointers.size === 1) {
    const only = pointerList()[0];
    updateAimFromScreen(only.x, only.y);
    if (only.role === 'pinch') only.role = 'pending';
  }
  if (pointers.size === 0) {
    leftDown = false;
    ctx.pointer.down = false;
    toolPointerId = null;
    panPointerId = null;
    canvas.style.cursor = isTouchPrimary ? 'default' : 'none';
  }
  try { canvas.releasePointerCapture?.(id); } catch {}
}

canvas.addEventListener('pointerup', releasePointer);
canvas.addEventListener('pointercancel', releasePointer);

canvas.addEventListener('pointerleave', (e) => {
  // Only clear mouse hover; keep touches
  if (e.pointerType === 'mouse' && pointers.size === 0) {
    leftDown = false;
    ctx.pointer.down = false;
  }
});

// Prevent iOS page scroll/bounce on the stage
document.getElementById('stage-wrap')?.addEventListener('touchmove', (e) => {
  if (playing) e.preventDefault();
}, { passive: false });

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (!playing) return;
  // Gentler zoom — trackpads were flinging zoom to min and losing the floor
  const sensitivity = e.deltaMode === 1 ? 0.035 : 0.0007;
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
  if (e.code === 'KeyH' || e.code === 'Home') { e.preventDefault(); focusSpawnCam(true); toast('CAMERA RESET'); }
  if (e.code === 'Escape') ctx.grab.endAll();
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
focusSpawnCam(true);

function drawEnvironment(time) {
  const c = ctx2d;
  const map = currentMap || getMap('gulag');
  map.paint(c, ctx.cam, ctx.floorY, time, SPRITES);
  drawMapProps(c, world, ctx.cam, map);
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
  // On touch, draw a reticle at each active contact; on mouse, one at pointer
  const c = ctx2d;
  const tool = TOOLS[toolIndex];
  const pts = pointers.size
    ? pointerList().map((p) => ({ x: p.x, y: p.y }))
    : [{ x: ctx.pointer.x, y: ctx.pointer.y }];

  for (const pt of pts) {
    c.save();
    c.translate(pt.x, pt.y);
    c.strokeStyle = 'rgba(201,162,39,0.9)';
    c.lineWidth = 1.5;
    const r = isTouchPrimary ? 22 : (tool.id === 'hand' ? 14 : 18);
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.moveTo(-r - 4, 0); c.lineTo(-4, 0);
    c.moveTo(4, 0); c.lineTo(r + 4, 0);
    c.moveTo(0, -r - 4); c.lineTo(0, -4);
    c.moveTo(0, 4); c.lineTo(0, r + 4);
    c.stroke();
    c.restore();
  }
}

// ─── Loop ───
let last = performance.now();
let time = 0;
let frameCount = 0;

function frame(now) {
  let dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  time += dt;
  frameCount++;

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
    // Hard clamp after physics — flings never sink through the floor
    preventFloorTunnel(people, ctx.floorY, currentMap?.id === 'moon' ? 55 : 42);

    if (leftDown && TOOLS[toolIndex].id !== 'hand') {
      ctx.tools.use(TOOLS[toolIndex].id, true, false);
    }
    ctx.tools.update(simDt);
    updatePeople(people, simDt, ctx);
    ctx.fx.update(simDt, ctx.floorY);

    // Periodic corpse cull under pressure
    if ((frameCount & 63) === 0) cullStaleCorpses();
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

  const sky0 = currentMap?.colors?.sky0 || '#16120e';
  const sky1 = currentMap?.colors?.sky1 || '#0c0a08';
  const grd = c.createLinearGradient(0, 0, 0, ctx.H);
  grd.addColorStop(0, sky0);
  grd.addColorStop(1, sky1);
  c.fillStyle = grd;
  c.fillRect(0, 0, ctx.W, ctx.H);

  const z = ctx.zoom || 1;
  // Light shake only — heavy shake + zoom felt nauseating
  const sx = ctx.shake ? (Math.random() - 0.5) * ctx.shake * 4 : 0;
  const sy = ctx.shake ? (Math.random() - 0.5) * ctx.shake * 4 : 0;
  c.translate(sx, sy);
  c.scale(z, z);

  const viewW = ctx.W / z;
  const viewH = ctx.H / z;
  drawEnvironment(time);
  ctx.fx.drawDecals(c, ctx.cam, viewW, viewH);
  drawPeople(c, people, ctx.cam, { w: viewW, h: viewH });
  ctx.tools.draw(c, ctx.cam);
  ctx.fx.draw(c, ctx.cam, viewW, viewH);

  // grab ropes (multitouch)
  activeGrabs.forEach((g) => {
    const ax = g.constraint.pointA.x - ctx.cam.x;
    const ay = g.constraint.pointA.y - ctx.cam.y;
    const bx = g.body.position.x - ctx.cam.x;
    const by = g.body.position.y - ctx.cam.y;
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
  });

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
  // Layout reflow after title hide — remeasure then frame spawn (critical on iPad)
  requestAnimationFrame(() => {
    resize();
    focusSpawnCam(true);
    spawnCrowd(5);
    toast(isTouchPrimary
      ? '1 finger = tool · 2 fingers = pan/zoom'
      : "WELCOME TO HENRI'S TORTURE GULAG");
  });
}

document.getElementById('btn-cam')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (!playing) return;
  sfx.unlock();
  focusSpawnCam(true);
  toast('CAMERA RESET');
});

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
  buildMapPicker();
  setTool(0);
  if (loading) loading.classList.add('hidden');
  document.getElementById('title-screen')?.classList.remove('hidden');
  requestAnimationFrame(frame);
}

boot();
