/** Human ragdoll factory, damage, severing, drawing. */

import { PART_SPRITE, PART_DRAW_SIZE } from './assets.js';

const { Bodies, Body, Composite, Constraint, Vector } = Matter;

/** Set by main after loadAll() */
export let SPRITES = null;
export function setSprites(s) { SPRITES = s; }

const PART_HP = {
  head: 55,
  torso: 120,
  upperArmL: 40, upperArmR: 40,
  lowerArmL: 30, lowerArmR: 30,
  upperLegL: 50, upperLegR: 50,
  lowerLegL: 35, lowerLegR: 35,
};

const COLORS = {
  skin: '#e8b896',
  skinDark: '#c48a64',
  shirt: '#3d6bff',
  pants: '#2a3348',
  hair: '#2b1d14',
  bone: '#f0e6d0',
  dead: '#6a6e78',
};

let nextId = 1;

function partOpts(label, personId, group) {
  return {
    label,
    personId,
    collisionFilter: { group },
    friction: 0.35,
    frictionAir: 0.02,
    restitution: 0.15,
    density: label === 'head' ? 0.0014 : label === 'torso' ? 0.0022 : 0.0016,
  };
}

export function createRagdoll(world, x, y, stats, palette) {
  const id = nextId++;
  const group = Body.nextGroup(true);
  const scale = 0.95 + Math.random() * 0.15;
  const shirt = palette?.shirt || pick([
    '#3d6bff', '#ff3d5a', '#3dff9a', '#ffb020', '#c44dff', '#54d3de',
  ]);
  const pants = palette?.pants || pick(['#2a3348', '#1e2433', '#3a2a1a', '#222']);
  const skin = palette?.skin || pick(['#e8b896', '#c48a64', '#f0c8a8', '#8d5524', '#ffd1b0']);

  // Larger hitboxes to match upscaled sprites
  const head = Bodies.circle(x, y - 58 * scale, 14 * scale, partOpts('head', id, group));
  const torso = Bodies.rectangle(x, y - 10 * scale, 28 * scale, 44 * scale, partOpts('torso', id, group));
  const upperArmL = Bodies.rectangle(x - 26 * scale, y - 20 * scale, 11 * scale, 28 * scale, partOpts('upperArmL', id, group));
  const upperArmR = Bodies.rectangle(x + 26 * scale, y - 20 * scale, 11 * scale, 28 * scale, partOpts('upperArmR', id, group));
  const lowerArmL = Bodies.rectangle(x - 26 * scale, y + 8 * scale, 10 * scale, 26 * scale, partOpts('lowerArmL', id, group));
  const lowerArmR = Bodies.rectangle(x + 26 * scale, y + 8 * scale, 10 * scale, 26 * scale, partOpts('lowerArmR', id, group));
  const upperLegL = Bodies.rectangle(x - 10 * scale, y + 34 * scale, 13 * scale, 32 * scale, partOpts('upperLegL', id, group));
  const upperLegR = Bodies.rectangle(x + 10 * scale, y + 34 * scale, 13 * scale, 32 * scale, partOpts('upperLegR', id, group));
  const lowerLegL = Bodies.rectangle(x - 10 * scale, y + 64 * scale, 11 * scale, 30 * scale, partOpts('lowerLegL', id, group));
  const lowerLegR = Bodies.rectangle(x + 10 * scale, y + 64 * scale, 11 * scale, 30 * scale, partOpts('lowerLegR', id, group));

  const parts = {
    head, torso,
    upperArmL, upperArmR, lowerArmL, lowerArmR,
    upperLegL, upperLegR, lowerLegL, lowerLegR,
  };

  const joints = [];
  function joint(a, b, ax, ay, bx, by, length, stiffness = 0.7, damping = 0.1) {
    const c = Constraint.create({
      bodyA: a, bodyB: b,
      pointA: { x: ax, y: ay },
      pointB: { x: bx, y: by },
      length: length * scale,
      stiffness,
      damping,
      label: `${a.label}-${b.label}`,
      personId: id,
    });
    joints.push(c);
    return c;
  }

  // neck / shoulders / hips / elbows / knees — snappier joints
  joint(head, torso, 0, 12 * scale, 0, -20 * scale, 2, 0.9, 0.18);
  joint(torso, upperArmL, -13 * scale, -14 * scale, 0, -12 * scale, 2, 0.72, 0.1);
  joint(torso, upperArmR, 13 * scale, -14 * scale, 0, -12 * scale, 2, 0.72, 0.1);
  joint(upperArmL, lowerArmL, 0, 12 * scale, 0, -11 * scale, 1, 0.62, 0.1);
  joint(upperArmR, lowerArmR, 0, 12 * scale, 0, -11 * scale, 1, 0.62, 0.1);
  joint(torso, upperLegL, -9 * scale, 20 * scale, 0, -14 * scale, 2, 0.78, 0.12);
  joint(torso, upperLegR, 9 * scale, 20 * scale, 0, -14 * scale, 2, 0.78, 0.12);
  joint(upperLegL, lowerLegL, 0, 14 * scale, 0, -13 * scale, 1, 0.62, 0.1);
  joint(upperLegR, lowerLegR, 0, 14 * scale, 0, -13 * scale, 1, 0.62, 0.1);

  // soft posture stabilizers (break on death)
  const stabilizers = [
    joint(head, torso, -7 * scale, 4 * scale, -10 * scale, -12 * scale, 16, 0.06, 0.03),
    joint(head, torso, 7 * scale, 4 * scale, 10 * scale, -12 * scale, 16, 0.06, 0.03),
  ];

  const hp = {};
  for (const k of Object.keys(parts)) hp[k] = PART_HP[k];

  const person = {
    id,
    parts,
    joints,
    stabilizers,
    hp,
    maxHp: { ...PART_HP },
    alive: true,
    deadAt: 0,
    skin,
    shirt,
    pants,
    scale,
    severed: new Set(),
    onFire: 0,
    bleeds: [],
  };

  for (const b of Object.values(parts)) {
    b.plugin = { person, part: b.label };
    Composite.add(world, b);
  }
  for (const j of joints) Composite.add(world, j);

  // slight random toss so they don't stack perfectly
  Body.setVelocity(torso, { x: (Math.random() - 0.5) * 2, y: -1 });
  Body.setAngularVelocity(torso, (Math.random() - 0.5) * 0.05);

  stats.people += 1;
  return person;
}

function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

export function damagePart(person, partName, amount, point, ctx) {
  if (!person || !partName) return 0;
  if (person.severed.has(partName) && partName !== 'torso' && partName !== 'head') {
    // detached chunk still takes hits for juice
  }
  const before = person.hp[partName] ?? 0;
  if (before <= 0 && partName !== 'torso') return 0;

  person.hp[partName] = Math.max(0, before - amount);
  const dealt = before - person.hp[partName];

  if (point && dealt > 0) {
    const mul = ctx.comboMul?.() || 1;
    ctx.fx.blood(point.x, point.y, Math.min(28, 6 + dealt * 0.4), 130 + amount * 4);
    if (amount > 16) ctx.fx.sparks(point.x, point.y, 5);
    if (amount > 28) ctx.fx.gib(point.x, point.y, 3);
    ctx.stats.chaos += Math.round(dealt * mul);
    ctx.registerHit?.(dealt, point);
    // pain flinch
    const body = person.parts[partName];
    if (body && amount > 8) {
      Body.applyForce(body, body.position, {
        x: (Math.random() - 0.5) * 0.006 * amount,
        y: -0.002 * amount,
      });
    }
  }

  // bleed emitter
  if (person.hp[partName] < person.maxHp[partName] * 0.5 && Math.random() < 0.4) {
    const body = person.parts[partName];
    if (body) person.bleeds.push({ part: partName, t: 1.2 + Math.random() });
  }

  // sever limbs when destroyed
  if (person.hp[partName] <= 0) {
    maybeSever(person, partName, ctx, point);
  }

  // death conditions
  if (person.alive && (person.hp.head <= 0 || person.hp.torso <= 0)) {
    killPerson(person, ctx, point);
  }

  return dealt;
}

function maybeSever(person, partName, ctx, point) {
  if (partName === 'torso' || partName === 'head') return;
  if (person.severed.has(partName)) return;

  // sever this joint and anything distal
  const tree = {
    upperArmL: ['lowerArmL'],
    upperArmR: ['lowerArmR'],
    lowerArmL: [],
    lowerArmR: [],
    upperLegL: ['lowerLegL'],
    upperLegR: ['lowerLegR'],
    lowerLegL: [],
    lowerLegR: [],
  };
  const toSever = [partName, ...(tree[partName] || [])];
  for (const name of toSever) {
    if (person.severed.has(name)) continue;
    person.severed.add(name);
    person.hp[name] = 0;
    // remove constraints involving this part
    const body = person.parts[name];
    for (let i = person.joints.length - 1; i >= 0; i--) {
      const j = person.joints[i];
      if (j.bodyA === body || j.bodyB === body) {
        Composite.remove(ctx.world, j);
        person.joints.splice(i, 1);
      }
    }
    if (body) {
      body.collisionFilter.group = 0;
      Body.setVelocity(body, {
        x: body.velocity.x + (Math.random() - 0.5) * 8,
        y: body.velocity.y - 4 - Math.random() * 4,
      });
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.4);
    }
    ctx.stats.limbs += 1;
    ctx.stats.chaos += 40;
  }
  const p = point || person.parts[partName]?.position;
  if (p) {
    ctx.fx.blood(p.x, p.y, 32, 340);
    ctx.fx.gib(p.x, p.y, 8);
    ctx.fx.floatText(p.x, p.y - 24, 'SEVERED', '#ff6b81', 1.15);
    ctx.fx.flash(p.x, p.y, 50, 'rgba(255,80,100,0.35)', 0.12);
  }
  ctx.sfx.sever();
  ctx.registerHit?.(50, p);
  ctx.triggerSlowMo?.(0.35, 0.45);
  ctx.toast?.('LIMB DETACHED');
}

export function killPerson(person, ctx, point) {
  if (!person.alive) return;
  person.alive = false;
  person.deadAt = performance.now();
  person.hp.head = Math.min(person.hp.head, 0);
  // loosen joints — ragdoll becomes fully limp
  for (const j of person.joints) {
    j.stiffness = Math.min(j.stiffness, 0.15);
    j.damping = 0.02;
  }
  for (const j of person.stabilizers) {
    try { Composite.remove(ctx.world, j); } catch {}
  }
  person.stabilizers = [];
  const p = point || person.parts.torso?.position || person.parts.head?.position;
  if (p) {
    ctx.fx.blood(p.x, p.y, 42, 320);
    ctx.fx.gib(p.x, p.y, 12);
    ctx.fx.smoke(p.x, p.y, 6);
    ctx.fx.floatText(p.x, p.y - 36, 'KIA', '#ff3d5a', 1.35);
    ctx.fx.flash(p.x, p.y, 90, 'rgba(255,60,90,0.4)', 0.2);
  }
  ctx.sfx.death();
  ctx.stats.kills += 1;
  const mul = ctx.comboMul?.() || 1;
  ctx.stats.chaos += Math.round(120 * mul);
  ctx.registerKill?.(p);
  ctx.triggerSlowMo?.(0.28, 0.7);
  ctx.toast?.('INMATE TERMINATED');
}

export function applyImpactDamage(pair, ctx) {
  const a = pair.bodyA;
  const b = pair.bodyB;
  const speed = Vector.magnitude(Vector.sub(a.velocity, b.velocity));
  if (speed < 5.5) return;

  for (const body of [a, b]) {
    const person = body.plugin?.person;
    const part = body.plugin?.part;
    if (!person || !part) continue;
    const other = body === a ? b : a;
    const dmg = Math.min(62, (speed - 5) * 2.4 * (other.isStatic ? 1.5 : other.plugin?.anvil ? 2.2 : 0.75));
    if (dmg < 3.5) continue;
    const pt = pair.collision?.supports?.[0] || body.position;
    damagePart(person, part, dmg, pt, ctx);
    if (dmg > 14) {
      ctx.sfx.hit();
      if (dmg > 30) ctx.fx.gib(pt.x, pt.y, 4);
    }
  }
}

export function updatePeople(people, dt, ctx) {
  for (const person of people) {
    // fire DoT
    if (person.onFire > 0) {
      person.onFire -= dt;
      const torso = person.parts.torso;
      if (torso && Math.random() < 0.35) {
        ctx.fx.fire(torso.position.x + (Math.random() - 0.5) * 16, torso.position.y + (Math.random() - 0.5) * 20, 4);
        damagePart(person, pick(Object.keys(person.parts)), 3 + Math.random() * 4, torso.position, ctx);
      }
    }

    // bleeding
    for (let i = person.bleeds.length - 1; i >= 0; i--) {
      const bl = person.bleeds[i];
      bl.t -= dt;
      if (bl.t <= 0 || person.severed.has(bl.part) && person.hp[bl.part] <= 0 && Math.random() < 0.02) {
        // keep severed stumps dripping longer
      }
      if (bl.t <= 0) { person.bleeds.splice(i, 1); continue; }
      const body = person.parts[bl.part];
      if (!body) continue;
      if (Math.random() < 0.5) {
        ctx.fx.blood(body.position.x, body.position.y, 2, 40);
        if (person.alive && Math.random() < 0.15) {
          damagePart(person, bl.part, 0.8, body.position, ctx);
        }
      }
    }
  }
}

export function drawPeople(ctx2d, people, cam) {
  const order = [
    'lowerLegL', 'lowerLegR', 'upperLegL', 'upperLegR',
    'lowerArmL', 'lowerArmR', 'upperArmL', 'upperArmR',
    'torso', 'head',
  ];

  // ground shadows first
  for (const person of people) {
    for (const name of order) {
      const body = person.parts[name];
      if (!body) continue;
      drawShadow(ctx2d, person, name, body, cam);
    }
  }
  for (const person of people) {
    for (const name of order) {
      const body = person.parts[name];
      if (!body) continue;
      drawPart(ctx2d, person, name, body, cam);
    }
  }
}

function drawShadow(ctx, person, name, body, cam) {
  const [pw, ph] = PART_DRAW_SIZE[name] || [16, 24];
  const sw = pw * person.scale * 1.2;
  const sh = ph * person.scale * 1.2;
  const x = body.position.x - cam.x;
  const y = body.position.y - cam.y + sh * 0.42;
  ctx.save();
  ctx.globalAlpha = person.alive ? 0.22 : 0.14;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, y, sw * 0.55, Math.max(4, sh * 0.12), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPart(ctx, person, name, body, cam) {
  const x = body.position.x - cam.x;
  const y = body.position.y - cam.y;
  const ang = body.angle;
  const hpPct = (person.hp[name] ?? 0) / (person.maxHp[name] || 1);
  const dead = !person.alive;
  const severed = person.severed.has(name);
  const flip = name.endsWith('L');

  const [pw, ph] = PART_DRAW_SIZE[name] || [16, 24];
  const sw = pw * person.scale * 1.22;
  const sh = ph * person.scale * 1.22;

  let spriteKey = PART_SPRITE[name];
  if (name === 'head' && dead) spriteKey = 'headDead';
  const sprite = SPRITES?.[spriteKey] || (name === 'head' && dead ? SPRITES?.headDead : null) || SPRITES?.[spriteKey];

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  if (flip) ctx.scale(-1, 1);

  if (sprite) {
    ctx.drawImage(sprite, -sw / 2, -sh / 2, sw, sh);

    // soft palette wash for subject variety
    if ((name === 'torso' || name.startsWith('upperArm')) && person.shirt) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = person.shirt;
      ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    // damage blood overlay
    if (hpPct < 0.65) {
      ctx.globalAlpha = (1 - hpPct) * 0.55;
      ctx.fillStyle = '#8a1020';
      ctx.beginPath();
      ctx.ellipse(sw * 0.1, 0, sw * 0.22, sh * 0.18, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (severed) {
      ctx.strokeStyle = '#f0e6d0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-sw / 2, -sh / 2 + 2);
      ctx.lineTo(sw / 2, -sh / 2 + 2);
      ctx.stroke();
    }
  } else {
    // procedural fallback
    let fill = person.skin;
    if (name === 'torso') fill = dead ? COLORS.dead : person.shirt;
    else if (name.startsWith('upperLeg') || name.startsWith('lowerLeg')) fill = dead ? '#3a3f4a' : person.pants;
    if (hpPct < 0.45) fill = mixHex(fill, '#7a0a1c', 1 - hpPct);
    if (name === 'head') {
      const r = 11 * person.scale;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      roundRect(ctx, -sw / 2, -sh / 2, sw, sh, 3);
      ctx.fillStyle = fill;
      ctx.fill();
    }
  }

  // fire glow
  if (person.onFire > 0 && (name === 'torso' || name === 'head')) {
    ctx.globalAlpha = 0.35 + Math.random() * 0.25;
    ctx.fillStyle = '#ff6b3d';
    ctx.beginPath();
    ctx.arc(0, 0, 14 + Math.random() * 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function mixHex(a, b, t) {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  if (!pa || !pb) return a;
  const r = (pa.r + (pb.r - pa.r) * t) | 0;
  const g = (pa.g + (pb.g - pa.g) * t) | 0;
  const bl = (pa.b + (pb.b - pa.b) * t) | 0;
  return `rgb(${r},${g},${bl})`;
}

function hexToRgb(hex) {
  if (!hex || hex[0] !== '#') return null;
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function bodyAt(people, x, y) {
  let best = null;
  let bestD = 28;
  for (const person of people) {
    for (const [name, body] of Object.entries(person.parts)) {
      const d = Vector.magnitude(Vector.sub(body.position, { x, y }));
      const rad = Math.max(body.bounds.max.x - body.bounds.min.x, body.bounds.max.y - body.bounds.min.y) * 0.55;
      if (d < Math.max(bestD, rad) && d < rad + 8) {
        bestD = d;
        best = { person, part: name, body };
      }
    }
  }
  return best;
}
