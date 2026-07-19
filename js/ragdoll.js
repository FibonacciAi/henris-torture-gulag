/** Human ragdoll factory, damage, severing, drawing. */

import { PART_SPRITE, PART_DRAW_SIZE } from './assets.js';
import { pickKind, pickFrom, getKind, PERSON_KINDS } from './kinds.js';

export { PERSON_KINDS, getKind, pickKind };

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

function partOpts(label, personId, group, kind) {
  const isFoot = label === 'lowerLegL' || label === 'lowerLegR';
  const isLeg = label.startsWith('upperLeg') || label.startsWith('lowerLeg');
  const dMul = kind?.densityMul ?? 1;
  const rest = kind?.restitution ?? 0.02;
  const air = kind?.frictionAir ?? 0.035;
  return {
    label,
    personId,
    collisionFilter: { group },
    friction: isFoot ? 1.2 : isLeg ? 0.7 : 0.45,
    frictionAir: air,
    restitution: rest,
    density: (label === 'head' ? 0.0015 : label === 'torso' ? 0.0024 : isFoot ? 0.002 : 0.0016) * dMul,
    sleepThreshold: 55,
    slop: isFoot ? 0.02 : 0.05,
  };
}

/** Hard cap — each inmate is ~10 bodies + joints. Beyond this FPS dies. */
export const MAX_INMATES = 28;

export function removePerson(world, person, people, stats) {
  if (!person || person._removed) return;
  person._removed = true;
  for (const b of Object.values(person.parts || {})) {
    try { Composite.remove(world, b); } catch {}
  }
  for (const j of person.joints || []) {
    try { Composite.remove(world, j); } catch {}
  }
  for (const j of person.stabilizers || []) {
    try { Composite.remove(world, j); } catch {}
  }
  const idx = people.indexOf(person);
  if (idx >= 0) people.splice(idx, 1);
  if (stats) stats.people = Math.max(0, (stats.people || 1) - 1);
}

/** Free slots by removing oldest dead, then oldest living. */
export function ensureCapacity(world, people, stats, need = 1) {
  while (people.length + need > MAX_INMATES && people.length > 0) {
    let victim = people.find((p) => !p.alive);
    if (!victim) victim = people[0];
    removePerson(world, victim, people, stats);
  }
}

/**
 * @param {object} [options]
 * @param {string} [options.kindId]
 * @param {number} [options.floorY]  if set, place feet on floor (y ignored for height)
 */
export function createRagdoll(world, x, y, stats, options = null) {
  const opts = options && typeof options === 'object' ? options : {};
  const kind = pickKind(opts.kindId);
  const id = nextId++;
  const group = Body.nextGroup(true);
  const scale = kind.scaleMin + Math.random() * (kind.scaleMax - kind.scaleMin);
  const shirt = opts.shirt || pickFrom(kind.shirt);
  const pants = opts.pants || pickFrom(kind.pants);
  const skin = opts.skin || pickFrom(kind.skin);
  const hpMul = kind.hpMul ?? 1;

  // Root y: place feet on floor when floorY given.
  let rootY = y;
  if (opts.floorY != null) {
    rootY = opts.floorY - 80 * scale;
  }
  const rootX = x;

  // Alien: oversized head hitbox
  const headR = (kind.id === 'alien' ? 20 : 14) * scale;
  const head = Bodies.circle(rootX, rootY - 58 * scale, headR, partOpts('head', id, group, kind));
  const torso = Bodies.rectangle(rootX, rootY - 10 * scale, 28 * scale, 44 * scale, partOpts('torso', id, group, kind));
  const upperArmL = Bodies.rectangle(rootX - 26 * scale, rootY - 20 * scale, 11 * scale, 28 * scale, partOpts('upperArmL', id, group, kind));
  const upperArmR = Bodies.rectangle(rootX + 26 * scale, rootY - 20 * scale, 11 * scale, 28 * scale, partOpts('upperArmR', id, group, kind));
  const lowerArmL = Bodies.rectangle(rootX - 26 * scale, rootY + 8 * scale, 10 * scale, 26 * scale, partOpts('lowerArmL', id, group, kind));
  const lowerArmR = Bodies.rectangle(rootX + 26 * scale, rootY + 8 * scale, 10 * scale, 26 * scale, partOpts('lowerArmR', id, group, kind));
  const upperLegL = Bodies.rectangle(rootX - 10 * scale, rootY + 34 * scale, 13 * scale, 32 * scale, partOpts('upperLegL', id, group, kind));
  const upperLegR = Bodies.rectangle(rootX + 10 * scale, rootY + 34 * scale, 13 * scale, 32 * scale, partOpts('upperLegR', id, group, kind));
  const lowerLegL = Bodies.rectangle(rootX - 10 * scale, rootY + 64 * scale, 11 * scale, 30 * scale, partOpts('lowerLegL', id, group, kind));
  const lowerLegR = Bodies.rectangle(rootX + 10 * scale, rootY + 64 * scale, 11 * scale, 30 * scale, partOpts('lowerLegR', id, group, kind));

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

  joint(head, torso, 0, 12 * scale, 0, -20 * scale, 2, 0.92, 0.22);
  joint(torso, upperArmL, -13 * scale, -14 * scale, 0, -12 * scale, 2, 0.75, 0.12);
  joint(torso, upperArmR, 13 * scale, -14 * scale, 0, -12 * scale, 2, 0.75, 0.12);
  joint(upperArmL, lowerArmL, 0, 12 * scale, 0, -11 * scale, 1, 0.65, 0.12);
  joint(upperArmR, lowerArmR, 0, 12 * scale, 0, -11 * scale, 1, 0.65, 0.12);
  joint(torso, upperLegL, -9 * scale, 20 * scale, 0, -14 * scale, 2, 0.88, 0.18);
  joint(torso, upperLegR, 9 * scale, 20 * scale, 0, -14 * scale, 2, 0.88, 0.18);
  joint(upperLegL, lowerLegL, 0, 14 * scale, 0, -13 * scale, 1, 0.82, 0.16);
  joint(upperLegR, lowerLegR, 0, 14 * scale, 0, -13 * scale, 1, 0.82, 0.16);

  const stabilizers = [
    joint(head, torso, -7 * scale, 4 * scale, -10 * scale, -12 * scale, 14, 0.12, 0.06),
    joint(head, torso, 7 * scale, 4 * scale, 10 * scale, -12 * scale, 14, 0.12, 0.06),
    joint(upperLegL, upperLegR, 0, 0, 0, 0, 22, 0.08, 0.05),
    joint(torso, lowerLegL, -10 * scale, 22 * scale, 0, 0, 52, 0.05, 0.04),
    joint(torso, lowerLegR, 10 * scale, 22 * scale, 0, 0, 52, 0.05, 0.04),
  ];

  const hp = {};
  const maxHp = {};
  for (const k of Object.keys(parts)) {
    maxHp[k] = Math.round(PART_HP[k] * hpMul);
    hp[k] = maxHp[k];
  }

  const person = {
    id,
    kindId: kind.id,
    kind,
    kindName: kind.name,
    kindEmoji: kind.emoji,
    parts,
    joints,
    stabilizers,
    hp,
    maxHp,
    alive: true,
    deadAt: 0,
    bornAt: performance.now(),
    skin,
    shirt,
    pants,
    scale,
    blood: kind.blood || '#8a1020',
    noBlood: !!kind.noBlood,
    floaty: !!kind.floaty,
    heavy: !!kind.heavy,
    tint: kind.tint || null,
    tintAlpha: kind.tintAlpha ?? 0,
    accessory: kind.accessory || null,
    severed: new Set(),
    onFire: 0,
    bleeds: [],
    _removed: false,
    mode: 'stand',
    stunT: 0,
    balance: 1,
  };

  for (const b of Object.values(parts)) {
    b.plugin = { person, part: b.label };
    Body.setAngle(b, 0);
    Body.setAngularVelocity(b, 0);
    Body.setVelocity(b, { x: 0, y: 0 });
    Composite.add(world, b);
  }
  for (const j of joints) Composite.add(world, j);

  stats.people += 1;
  return person;
}

/** Knock them out of stand mode (yeet, heavy hit, explosion). */
export function stunPerson(person, seconds = 1.4) {
  if (!person || !person.alive) return;
  person.stunT = Math.max(person.stunT || 0, seconds);
  person.mode = 'ragdoll';
}

const STAND_ANGLES = {
  torso: 0,
  head: 0,
  upperArmL: 0.12,
  upperArmR: -0.12,
  lowerArmL: 0.08,
  lowerArmR: -0.08,
  upperLegL: 0.04,
  upperLegR: -0.04,
  lowerLegL: 0,
  lowerLegR: 0,
};

function normAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Active posture — living inmates try to stand when feet find the floor.
 * Grab / stun / high speed → full ragdoll. Death → limp forever.
 */
function applyStanding(person, dt, ctx) {
  if (!person.alive || person._removed) return;

  const torso = person.parts.torso;
  if (!torso) return;

  const floorY = ctx.floorY ?? 900;
  const grabbed = ctx.isPersonGrabbed?.(person);
  const spd = Math.hypot(torso.velocity.x, torso.velocity.y);

  if (person.stunT > 0) person.stunT -= dt;

  // External disruption
  if (grabbed) {
    person.mode = 'ragdoll';
    person.stunT = Math.max(person.stunT, 0.35);
    return;
  }
  if (person.stunT > 0 || spd > 16) {
    person.mode = 'ragdoll';
    // Still damp extreme spin so they don't blender forever
    if (spd > 16) {
      for (const b of Object.values(person.parts)) {
        if (b) Body.setAngularVelocity(b, b.angularVelocity * 0.97);
      }
    }
    return;
  }

  const footL = person.parts.lowerLegL;
  const footR = person.parts.lowerLegR;
  const feet = [footL, footR].filter((f) => f && !person.severed.has(f.label));
  let feetDown = 0;
  for (const f of feet) {
    if (f.position.y > floorY - 38) feetDown += 1;
  }

  // In air — gentle upright torque only
  if (feetDown === 0 && torso.position.y < floorY - 130) {
    person.mode = 'air';
    const err = normAngle(torso.angle);
    Body.setAngularVelocity(torso, torso.angularVelocity * 0.96 - err * 0.04);
    return;
  }

  person.mode = 'stand';

  // Angular springs toward standing rest pose
  for (const [name, target] of Object.entries(STAND_ANGLES)) {
    if (person.severed.has(name)) continue;
    const b = person.parts[name];
    if (!b) continue;
    const err = normAngle(b.angle - target);
    const strength = name === 'torso' || name === 'head' ? 0.18
      : name.startsWith('upperLeg') || name.startsWith('lowerLeg') ? 0.15
        : 0.07;
    Body.setAngularVelocity(b, b.angularVelocity * 0.82 - err * strength);
  }

  // Balance: COM over mid-feet
  if (feet.length) {
    const midX = feet.reduce((s, f) => s + f.position.x, 0) / feet.length;
    const lean = torso.position.x - midX;
    Body.applyForce(torso, torso.position, { x: -lean * 0.00008, y: 0 });

    // Keep hips up so they don't crumple into a pile
    const standHipY = floorY - 92 * person.scale;
    if (torso.position.y > standHipY) {
      const lift = Math.min(0.0065, (torso.position.y - standHipY) * 0.00012);
      Body.applyForce(torso, torso.position, { x: 0, y: -lift });
    }

    // Foot plant — kill downward + skid when on ground
    for (const f of feet) {
      if (f.position.y > floorY - 34) {
        Body.setVelocity(f, {
          x: f.velocity.x * 0.5,
          y: Math.min(f.velocity.y, 0) * 0.15,
        });
        // Nudge feet to floor contact so they "stand" instead of hover-sink
        const halfH = Math.max(6, (f.bounds.max.y - f.bounds.min.y) * 0.45);
        const targetY = floorY - halfH - 1;
        if (f.position.y > targetY - 6) {
          Body.setPosition(f, { x: f.position.x, y: Math.min(f.position.y, targetY) });
        }
      }
    }
  }

  // Standing friction — less ice-skating
  Body.setVelocity(torso, {
    x: torso.velocity.x * 0.86,
    y: torso.velocity.y * (torso.velocity.y > 0 ? 0.9 : 1),
  });
  if (person.parts.head) {
    Body.setVelocity(person.parts.head, {
      x: person.parts.head.velocity.x * 0.9,
      y: person.parts.head.velocity.y,
    });
  }
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
    const load = ctx.people?.length || 0;
    const fxScale = load > 18 ? 0.35 : load > 12 ? 0.6 : 1;
    if (person.noBlood) {
      ctx.fx.sparks(point.x, point.y, Math.ceil((8 + dealt * 0.3) * fxScale));
    } else {
      ctx.fx.blood(
        point.x, point.y,
        Math.min(28, 6 + dealt * 0.4) * fxScale,
        130 + amount * 4,
        person.blood || null
      );
    }
    if (amount > 16 && fxScale > 0.4) ctx.fx.sparks(point.x, point.y, Math.ceil(5 * fxScale));
    if (amount > 28 && fxScale > 0.5 && !person.noBlood) ctx.fx.gib(point.x, point.y, Math.ceil(3 * fxScale));
    ctx.stats.chaos += Math.round(dealt * mul);
    ctx.registerHit?.(dealt, point);
    // Big hits knock them off their feet
    if (amount > 10) stunPerson(person, 0.6 + Math.min(1.5, amount * 0.03));
    const body = person.parts[partName];
    if (body && amount > 8 && load < 20) {
      Body.applyForce(body, body.position, {
        x: (Math.random() - 0.5) * 0.006 * amount,
        y: -0.002 * amount,
      });
    }
  }

  // bleed emitter
  if (!person.noBlood && person.hp[partName] < person.maxHp[partName] * 0.5 && Math.random() < 0.4) {
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
  person.mode = 'ragdoll';
  person.stunT = 0;
  person.hp.head = Math.min(person.hp.head, 0);
  // Sleep corpses faster — less solver work
  for (const b of Object.values(person.parts)) {
    if (b) {
      b.frictionAir = 0.06;
      b.slop = 0.08;
    }
  }
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
    if (person.noBlood) ctx.fx.sparks(p.x, p.y, 24);
    else {
      ctx.fx.blood(p.x, p.y, 42, 320, person.blood || null);
      ctx.fx.gib(p.x, p.y, 12);
    }
    ctx.fx.smoke(p.x, p.y, 6);
    const tag = person.kindEmoji ? `${person.kindEmoji} KIA` : 'KIA';
    ctx.fx.floatText(p.x, p.y - 36, tag, person.kind?.labelColor || '#ff3d5a', 1.35);
    ctx.fx.flash(p.x, p.y, 90, 'rgba(255,60,90,0.4)', 0.2);
  }
  ctx.sfx.death();
  ctx.stats.kills += 1;
  const mul = ctx.comboMul?.() || 1;
  ctx.stats.chaos += Math.round(120 * mul);
  ctx.registerKill?.(p);
  ctx.triggerSlowMo?.(0.28, 0.7);
  ctx.toast?.(`${person.kindEmoji || ''} ${person.kindName || 'INMATE'} DOWN`.trim());
}

/**
 * Collision damage is ONLY for real hazards / violence — never for:
 * - landing on floor / walls / tables after spawn or fall
 * - limbs clacking against each other (same inmate)
 * Soft drops must never chip HP or kill.
 */
export function applyImpactDamage(pair, ctx) {
  const a = pair.bodyA;
  const b = pair.bodyB;
  const speed = Vector.magnitude(Vector.sub(a.velocity, b.velocity));
  if (speed < 10) return;

  for (const body of [a, b]) {
    const person = body.plugin?.person;
    const part = body.plugin?.part;
    if (!person || !part) continue;

    const other = body === a ? b : a;

    // Own limbs thrashing on land — never self-damage
    if (other.plugin?.person && other.plugin.person.id === person.id) continue;

    // Floor, walls, ceilings, crates, tables — never hurt on contact.
    // (Yeet damage is applied on grab-release; tools/projectiles handle the rest.)
    if (other.isStatic && !other.plugin?.anvil && !other.plugin?.spike && !other.plugin?.mine) {
      continue;
    }

    // Moving hazards only
    let mul = 0;
    if (other.plugin?.anvil) mul = 2.4;
    else if (other.plugin?.spike) mul = 1.9;
    else if (other.plugin?.bullet || other.plugin?.rocket || other.plugin?.grenade) mul = 1.5;
    else if (other.plugin?.person) {
      // inmate-on-inmate: only hard collisions
      if (speed < 22) continue;
      mul = 0.45;
    } else {
      continue;
    }

    const dmg = Math.min(55, (speed - 8) * 1.6 * mul);
    if (dmg < 6) continue;
    const pt = pair.collision?.supports?.[0] || body.position;
    damagePart(person, part, dmg, pt, ctx);
    if (dmg > 14) {
      ctx.sfx.hit();
      if (dmg > 30) ctx.fx.gib(pt.x, pt.y, 4);
    }
  }
}

export function updatePeople(people, dt, ctx) {
  const n = people.length;
  const heavy = n > 14;
  const bleedChance = heavy ? 0.18 : 0.5;
  const fireChance = heavy ? 0.12 : 0.35;

  for (const person of people) {
    if (person._removed) continue;

    // Standing / balance (cheap; always)
    applyStanding(person, dt, ctx);

    // Balloon / alien float drift
    if (person.alive && person.floaty && person.parts.torso) {
      const t = person.parts.torso;
      Body.applyForce(t, t.position, {
        x: Math.sin((person.id + performance.now() * 0.001) * 1.7) * 0.00015,
        y: -0.00055 * (person.kindId === 'balloon' ? 1.2 : 0.7),
      });
    }

    // fire DoT
    if (person.onFire > 0) {
      person.onFire -= dt;
      const torso = person.parts.torso;
      if (torso && Math.random() < fireChance) {
        if (!heavy || Math.random() < 0.5) {
          ctx.fx.fire(torso.position.x + (Math.random() - 0.5) * 16, torso.position.y + (Math.random() - 0.5) * 20, heavy ? 2 : 4);
        }
        damagePart(person, pick(Object.keys(person.parts)), 3 + Math.random() * 4, torso.position, ctx);
        stunPerson(person, 0.8);
      }
    }

    // bleeding — throttle hard under load
    if (person.bleeds.length && (!heavy || Math.random() < 0.4)) {
      for (let i = person.bleeds.length - 1; i >= 0; i--) {
        const bl = person.bleeds[i];
        bl.t -= dt;
        if (bl.t <= 0) { person.bleeds.splice(i, 1); continue; }
        const body = person.parts[bl.part];
        if (!body) continue;
        if (Math.random() < bleedChance) {
          if (!heavy) ctx.fx.blood(body.position.x, body.position.y, 2, 40);
          else if (Math.random() < 0.25) ctx.fx.decal?.(body.position.x, ctx.floorY - 2, 6);
          if (person.alive && Math.random() < 0.12) {
            damagePart(person, bl.part, 0.8, body.position, ctx);
          }
        }
      }
    }

    // Cap bleed list
    if (person.bleeds.length > 4) person.bleeds.length = 4;
  }
}

/**
 * Hard stop floor tunneling after big flings.
 * Caps speed + clamps any limb that sank through the floor slab.
 */
export function preventFloorTunnel(people, floorY, maxSpeed = 42) {
  for (const person of people) {
    if (person._removed) continue;
    for (const b of Object.values(person.parts)) {
      if (!b) continue;
      const vx = b.velocity.x;
      const vy = b.velocity.y;
      const spd = Math.hypot(vx, vy);
      if (spd > maxSpeed) {
        const s = maxSpeed / spd;
        Body.setVelocity(b, { x: vx * s, y: vy * s });
      }
      // Approximate body half-height from bounds
      const halfH = Math.max(6, (b.bounds.max.y - b.bounds.min.y) * 0.45);
      const maxY = floorY - halfH - 1;
      if (b.position.y > maxY) {
        Body.setPosition(b, { x: b.position.x, y: maxY });
        if (b.velocity.y > 0) {
          Body.setVelocity(b, { x: b.velocity.x * 0.45, y: 0 });
        }
        Body.setAngularVelocity(b, b.angularVelocity * 0.5);
      }
    }
  }
}

function inView(body, cam, viewW, viewH, margin = 80) {
  const x = body.position.x - cam.x;
  const y = body.position.y - cam.y;
  return x > -margin && x < viewW + margin && y > -margin && y < viewH + margin;
}

export function drawPeople(ctx2d, people, cam, view) {
  const order = [
    'lowerLegL', 'lowerLegR', 'upperLegL', 'upperLegR',
    'lowerArmL', 'lowerArmR', 'upperArmL', 'upperArmR',
    'torso', 'head',
  ];
  const n = people.length;
  const viewW = view?.w ?? 1200;
  const viewH = view?.h ?? 800;
  const drawShadows = n <= 12;
  const simple = n > 18;

  for (const person of people) {
    if (person._removed) continue;
    const torso = person.parts.torso || person.parts.head;
    if (torso && !inView(torso, cam, viewW, viewH, 120)) continue;

    if (drawShadows && !simple) {
      // one shadow under torso only
      const t = person.parts.torso;
      if (t) drawShadow(ctx2d, person, 'torso', t, cam);
    }

    for (const name of order) {
      const body = person.parts[name];
      if (!body) continue;
      if (!inView(body, cam, viewW, viewH, 60)) continue;
      drawPart(ctx2d, person, name, body, cam, simple);
    }
  }
}

function drawShadow(ctx, person, name, body, cam) {
  const [pw, ph] = PART_DRAW_SIZE[name] || [16, 24];
  const sw = pw * person.scale * 1.2;
  const sh = ph * person.scale * 1.2;
  const x = body.position.x - cam.x;
  const y = body.position.y - cam.y + sh * 0.42;
  ctx.globalAlpha = person.alive ? 0.18 : 0.1;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, y, sw * 0.55, Math.max(4, sh * 0.12), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawPart(ctx, person, name, body, cam, simple = false) {
  const x = body.position.x - cam.x;
  const y = body.position.y - cam.y;
  const ang = body.angle;
  const hpPct = (person.hp[name] ?? 0) / (person.maxHp[name] || 1);
  const dead = !person.alive;
  const severed = person.severed.has(name);
  const flip = name.endsWith('L');

  // Alien head / goblin scale tweaks on draw
  let sizeMul = 1.22;
  if (name === 'head' && person.kindId === 'alien') sizeMul = 1.55;
  if (person.kindId === 'bruiser') sizeMul = 1.28;
  if (person.kindId === 'goblin') sizeMul = 1.15;

  const [pw, ph] = PART_DRAW_SIZE[name] || [16, 24];
  const sw = pw * person.scale * sizeMul;
  const sh = ph * person.scale * sizeMul;

  let spriteKey = PART_SPRITE[name];
  if (name === 'head' && dead) spriteKey = 'headDead';
  const sprite = SPRITES?.[spriteKey] || (name === 'head' && dead ? SPRITES?.headDead : null) || SPRITES?.[spriteKey];

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  if (flip) ctx.scale(-1, 1);

  // Super cape behind torso
  if (!simple && name === 'torso' && person.accessory === 'cape' && person.alive) {
    ctx.fillStyle = person.shirt || '#2040ff';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(-sw * 0.35, -sh * 0.2);
    ctx.quadraticCurveTo(-sw * 0.9, sh * 0.4, -sw * 0.5, sh * 0.95);
    ctx.lineTo(sw * 0.15, sh * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (sprite) {
    // Tint ONLY the sprite pixels (offscreen) — never fillRect on the main canvas
    // (source-atop against the stage painted solid color boxes over the background).
    if (!simple && person.tint && person.tintAlpha > 0.02) {
      drawTintedSprite(ctx, sprite, -sw / 2, -sh / 2, sw, sh, person.tint, person.tintAlpha);
    } else {
      ctx.drawImage(sprite, -sw / 2, -sh / 2, sw, sh);
    }

    if (!simple) {
      // Soft clothing wash — clipped to sprite alpha via destination-in style path:
      // draw color then keep only where sprite was (using multiply is too harsh on bg).
      if ((name === 'torso' || name.startsWith('upperArm')) && person.shirt) {
        softSpriteWash(ctx, sprite, -sw / 2, -sh / 2, sw, sh, person.shirt, person.kindId === 'inmate' ? 0.2 : 0.32);
      }
      if ((name.startsWith('upperLeg') || name.startsWith('lowerLeg')) && person.pants) {
        softSpriteWash(ctx, sprite, -sw / 2, -sh / 2, sw, sh, person.pants, 0.26);
      }
      if (hpPct < 0.65 && !person.noBlood) {
        ctx.globalAlpha = (1 - hpPct) * 0.55;
        ctx.fillStyle = person.blood || '#8a1020';
        ctx.beginPath();
        ctx.ellipse(sw * 0.1, 0, sw * 0.22, sh * 0.18, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (severed) {
        ctx.strokeStyle = person.noBlood ? '#88ccff' : '#f0e6d0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-sw / 2, -sh / 2 + 2);
        ctx.lineTo(sw / 2, -sh / 2 + 2);
        ctx.stroke();
      }
    }
  } else {
    let fill = person.skin;
    if (name === 'torso') fill = dead ? COLORS.dead : person.shirt;
    else if (name.startsWith('upperLeg') || name.startsWith('lowerLeg')) fill = dead ? '#3a3f4a' : person.pants;
    if (hpPct < 0.45 && !person.noBlood) fill = mixHex(fill, person.blood || '#7a0a1c', 1 - hpPct);
    if (name === 'head') {
      const r = 11 * person.scale * (person.kindId === 'alien' ? 1.4 : 1);
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

  // Accessories on head
  if (!simple && name === 'head' && person.alive) {
    drawAccessory(ctx, person, sw, sh);
  }

  if (!simple && person.onFire > 0 && (name === 'torso' || name === 'head')) {
    ctx.globalAlpha = 0.35 + Math.random() * 0.25;
    ctx.fillStyle = '#ff6b3d';
    ctx.beginPath();
    ctx.arc(0, 0, 14 + Math.random() * 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

/** Offscreen cache so we never tint the stage background. */
const _tintCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
const _tintCtx = _tintCanvas ? _tintCanvas.getContext('2d') : null;

function drawTintedSprite(ctx, sprite, x, y, w, h, color, alpha) {
  if (!_tintCtx || !sprite) {
    ctx.drawImage(sprite, x, y, w, h);
    return;
  }
  const tw = Math.max(1, Math.ceil(w));
  const th = Math.max(1, Math.ceil(h));
  if (_tintCanvas.width < tw || _tintCanvas.height < th) {
    _tintCanvas.width = tw;
    _tintCanvas.height = th;
  }
  const o = _tintCtx;
  o.clearRect(0, 0, tw, th);
  o.globalCompositeOperation = 'source-over';
  o.globalAlpha = 1;
  o.drawImage(sprite, 0, 0, tw, th);
  o.globalCompositeOperation = 'source-atop';
  o.globalAlpha = Math.min(1, alpha);
  o.fillStyle = color;
  o.fillRect(0, 0, tw, th);
  o.globalCompositeOperation = 'source-over';
  o.globalAlpha = 1;
  ctx.drawImage(_tintCanvas, 0, 0, tw, th, x, y, w, h);
}

function softSpriteWash(ctx, sprite, x, y, w, h, color, alpha) {
  if (!_tintCtx || !sprite || alpha <= 0) return;
  const tw = Math.max(1, Math.ceil(w));
  const th = Math.max(1, Math.ceil(h));
  if (_tintCanvas.width < tw || _tintCanvas.height < th) {
    _tintCanvas.width = tw;
    _tintCanvas.height = th;
  }
  const o = _tintCtx;
  o.clearRect(0, 0, tw, th);
  o.globalCompositeOperation = 'source-over';
  o.globalAlpha = 1;
  o.drawImage(sprite, 0, 0, tw, th);
  o.globalCompositeOperation = 'source-in';
  o.globalAlpha = Math.min(1, alpha);
  o.fillStyle = color;
  o.fillRect(0, 0, tw, th);
  o.globalCompositeOperation = 'source-over';
  o.globalAlpha = 1;
  ctx.globalAlpha = 1;
  ctx.drawImage(_tintCanvas, 0, 0, tw, th, x, y, w, h);
}

function drawAccessory(ctx, person, sw, sh) {
  const a = person.accessory;
  if (!a) return;
  const s = person.scale;

  if (a === 'horns') {
    ctx.fillStyle = '#2a4010';
    ctx.beginPath();
    ctx.moveTo(-sw * 0.25, -sh * 0.35);
    ctx.lineTo(-sw * 0.45, -sh * 0.85);
    ctx.lineTo(-sw * 0.05, -sh * 0.4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sw * 0.25, -sh * 0.35);
    ctx.lineTo(sw * 0.45, -sh * 0.85);
    ctx.lineTo(sw * 0.05, -sh * 0.4);
    ctx.fill();
  } else if (a === 'antenna') {
    ctx.strokeStyle = '#88aacc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -sh * 0.45);
    ctx.lineTo(0, -sh * 0.95);
    ctx.stroke();
    ctx.fillStyle = '#44eeff';
    ctx.beginPath();
    ctx.arc(0, -sh * 0.98, 4 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (a === 'hat') {
    ctx.fillStyle = '#3a1070';
    ctx.beginPath();
    ctx.moveTo(-sw * 0.55, -sh * 0.15);
    ctx.lineTo(0, -sh * 1.15);
    ctx.lineTo(sw * 0.55, -sh * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(-sw * 0.08, -sh * 1.15, sw * 0.16, sh * 0.12);
  } else if (a === 'helmet') {
    ctx.fillStyle = '#8a9098';
    ctx.beginPath();
    ctx.ellipse(0, -sh * 0.15, sw * 0.48, sh * 0.42, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#c0c8d0';
    ctx.fillRect(-sw * 0.5, -sh * 0.2, sw, sh * 0.12);
  } else if (a === 'clown') {
    ctx.fillStyle = '#ff2244';
    ctx.beginPath();
    ctx.arc(0, sh * 0.08, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2244ff';
    ctx.beginPath();
    ctx.arc(-sw * 0.22, -sh * 0.05, 4 * s, 0, Math.PI * 2);
    ctx.arc(sw * 0.22, -sh * 0.05, 4 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (a === 'beak') {
    ctx.fillStyle = '#ff9040';
    ctx.beginPath();
    ctx.moveTo(-2, sh * 0.1);
    ctx.lineTo(sw * 0.55, sh * 0.15);
    ctx.lineTo(-2, sh * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff4040';
    ctx.beginPath();
    ctx.moveTo(-sw * 0.1, -sh * 0.55);
    ctx.lineTo(0, -sh * 0.95);
    ctx.lineTo(sw * 0.1, -sh * 0.55);
    ctx.fill();
  } else if (a === 'mask') {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(-sw * 0.4, -sh * 0.15, sw * 0.8, sh * 0.28);
    ctx.fillStyle = '#111';
    ctx.fillRect(-sw * 0.48, -sh * 0.35, sw * 0.96, sh * 0.12);
  } else if (a === 'brow') {
    ctx.strokeStyle = '#2a1810';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-sw * 0.3, -sh * 0.15);
    ctx.lineTo(-sw * 0.05, -sh * 0.22);
    ctx.moveTo(sw * 0.3, -sh * 0.15);
    ctx.lineTo(sw * 0.05, -sh * 0.22);
    ctx.stroke();
  } else if (a === 'scar') {
    ctx.strokeStyle = '#3a5020';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sw * 0.1, -sh * 0.2);
    ctx.lineTo(sw * 0.28, sh * 0.15);
    ctx.stroke();
  } else if (a === 'smile') {
    ctx.strokeStyle = '#aa6600';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, sh * 0.1, 6 * s, 0.15, Math.PI - 0.15);
    ctx.stroke();
  } else if (a === 'balloon') {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -sh * 0.5);
    ctx.lineTo(sw * 0.4, -sh * 1.2);
    ctx.stroke();
    ctx.fillStyle = person.shirt || '#ff70a0';
    ctx.beginPath();
    ctx.ellipse(sw * 0.4, -sh * 1.35, 8 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (a === 'skull') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(-sw * 0.15, 0, 3 * s, 0, Math.PI * 2);
    ctx.arc(sw * 0.15, 0, 3 * s, 0, Math.PI * 2);
    ctx.fill();
  }
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
