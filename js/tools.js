/** Arsenal of unhinged implements. */

const { Bodies, Body, Composite, Constraint, Query, Vector } = Matter;

/** Set by main after loadAll() */
let SPRITES = null;
export function setToolSprites(s) { SPRITES = s; }

export const TOOLS = [
  { id: 'hand', name: 'HAND', icon: '✋', key: '1', desc: 'Right-drag or left-drag to grab and fling. Speed kills.' },
  { id: 'pistol', name: 'PISTOL', icon: '🔫', key: '2', desc: 'Single high-velocity round. Good for precision maiming.' },
  { id: 'shotgun', name: 'SHOTGUN', icon: '💥', key: '3', desc: 'Pellet cone. Deletes knees for fun and profit.' },
  { id: 'bat', name: 'BAT', icon: '🏏', key: '4', desc: 'Melee arc. Send subjects into the stratosphere.' },
  { id: 'sledge', name: 'SLEDGE', icon: '🔨', key: '5', desc: 'Heavy crush. Excellent for torso pancake experiments.' },
  { id: 'chainsaw', name: 'CHAINSAW', icon: '⚙️', key: '6', desc: 'Hold to chew. High sever chance. Messy.' },
  { id: 'rocket', name: 'ROCKET', icon: '🚀', key: '7', desc: 'Click to fire a tracking-free rocket. Boom.' },
  { id: 'grenade', name: 'GRENADE', icon: '💣', key: '8', desc: 'Throw a timed charge. Cook optional (instant fuse).' },
  { id: 'mine', name: 'MINE', icon: '⬡', key: '9', desc: 'Place a pressure mine. Subjects discover it the hard way.' },
  { id: 'flame', name: 'FLAMETHROWER', icon: '🔥', key: '0', desc: 'Hold to roast. Fire DoT + panic physics.' },
  { id: 'laser', name: 'LASER', icon: '🔴', key: '-', desc: 'Hitscan beam. Slices HP off everything on the line.' },
  { id: 'lightning', name: 'LIGHTNING', icon: '⚡', key: '=', desc: 'Sky zap. Chain arc between nearby meatbags.' },
  { id: 'anvil', name: 'ANVIL', icon: '⬛', key: 'Q', desc: 'Drop a dense anvil from the ceiling. Newton approves.' },
  { id: 'spikes', name: 'SPIKE TRAP', icon: '🔺', key: 'W', desc: 'Spawn a bed of spikes under the cursor.' },
  { id: 'slice', name: 'SLICE', icon: '🗡️', key: 'E', desc: 'Guillotine plane — severs whatever it crosses.' },
  { id: 'hole', name: 'BLACK HOLE', icon: '🕳️', key: 'R', desc: 'Short-lived gravity well. Spaghettification lite.' },
];

export function createToolSystem(ctx) {
  const projectiles = [];
  const hazards = []; // mines, spikes, anvils tracked
  const beams = [];
  let chainsawHeat = 0;
  let flameHeat = 0;

  function mouseWorld() {
    // Must match main.js worldFromPointer (screen → world with zoom)
    const z = ctx.zoom || 1;
    return {
      x: ctx.pointer.x / z + ctx.cam.x,
      y: ctx.pointer.y / z + ctx.cam.y,
    };
  }

  function use(toolId, isDown, justPressed) {
    const m = mouseWorld();
    switch (toolId) {
      case 'hand':
        if (justPressed) ctx.grab.start(m.x, m.y);
        break;
      case 'pistol':
        if (justPressed) fireBullet(m, 1, 22, 28, 18);
        break;
      case 'shotgun':
        if (justPressed) {
          ctx.sfx.shotgun();
          for (let i = 0; i < 8; i++) {
            const spread = (Math.random() - 0.5) * 0.45;
            fireBullet(m, 1, 14, 16 + Math.random() * 6, 10, spread);
          }
        }
        break;
      case 'bat':
        if (justPressed) melee(m, 70, 28, 16, 0.9);
        break;
      case 'sledge':
        if (justPressed) melee(m, 90, 48, 26, 1.4);
        break;
      case 'chainsaw':
        if (isDown) {
          chainsawHeat += ctx.dt;
          if (chainsawHeat > 0.05) {
            chainsawHeat = 0;
            chainsaw(m);
          }
        }
        break;
      case 'rocket':
        if (justPressed) fireRocket(m);
        break;
      case 'grenade':
        if (justPressed) throwGrenade(m);
        break;
      case 'mine':
        if (justPressed) placeMine(m);
        break;
      case 'flame':
        if (isDown) {
          flameHeat += ctx.dt;
          if (flameHeat > 0.04) {
            flameHeat = 0;
            flamethrower(m);
          }
        }
        break;
      case 'laser':
        if (justPressed || (isDown && Math.random() < 0.4)) laser(m);
        break;
      case 'lightning':
        if (justPressed) lightning(m);
        break;
      case 'anvil':
        if (justPressed) dropAnvil(m);
        break;
      case 'spikes':
        if (justPressed) placeSpikes(m);
        break;
      case 'slice':
        if (justPressed) slice(m);
        break;
      case 'hole':
        if (justPressed) blackHole(m);
        break;
      default:
        break;
    }
  }

  function aimDir(m) {
    // Aim from viewport center (world) through the cursor so shots track the crosshair.
    const z = ctx.zoom || 1;
    const cx = ctx.cam.x + (ctx.W * 0.5) / z;
    const cy = ctx.cam.y + (ctx.H * 0.55) / z;
    const ang = Math.atan2(m.y - cy, m.x - cx);
    ctx.aimAngle = ang;
    // Muzzle just behind the cursor along the aim line (bullet path goes through cursor)
    const ox = m.x - Math.cos(ang) * 28;
    const oy = m.y - Math.sin(ang) * 28;
    return { x: Math.cos(ang), y: Math.sin(ang), ox, oy, ang };
  }

  function fireBullet(m, count, dmg, speed, radius, spread = 0) {
    const aim = aimDir(m);
    const ang = aim.ang + spread;
    const body = Bodies.circle(aim.ox, aim.oy, 3.5, {
      label: 'bullet',
      frictionAir: 0.008,
      density: 0.0025,
      restitution: 0.05,
      collisionFilter: { category: 0x0008, mask: 0xffffffff },
    });
    Body.setVelocity(body, { x: Math.cos(ang) * speed * 1.15, y: Math.sin(ang) * speed * 1.15 });
    body.plugin = { bullet: true, dmg, life: 1.0, radius };
    Composite.add(ctx.world, body);
    projectiles.push(body);
    ctx.sfx.shoot();
    ctx.fx.sparks(aim.ox, aim.oy, 5);
    ctx.fx.trail?.(aim.ox, aim.oy, 'rgba(255,200,80,0.6)');
    ctx.shake = Math.max(ctx.shake || 0, 0.35);
  }

  function melee(m, reach, dmg, knock, shake) {
    ctx.sfx.thwack();
    ctx.fx.flash(m.x, m.y, 60, 'rgba(255,200,120,0.4)', 0.12);
    // swing arc visual
    ctx.fx.sparks(m.x, m.y, 6);
    const hit = Query.region(ctx.world.bodies, {
      min: { x: m.x - reach, y: m.y - reach },
      max: { x: m.x + reach, y: m.y + reach },
    });
    let hits = 0;
    for (const b of hit) {
      if (!b.plugin?.person) continue;
      const d = Vector.magnitude(Vector.sub(b.position, m));
      if (d > reach) continue;
      hits++;
      const dir = Vector.normalise(Vector.sub(b.position, m));
      Body.setVelocity(b, {
        x: b.velocity.x + dir.x * knock * 1.15,
        y: b.velocity.y + dir.y * knock * 0.9 - 6,
      });
      Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.65);
      ctx.damagePart(b.plugin.person, b.plugin.part, dmg, b.position, ctx);
      ctx.fx.blood(b.position.x, b.position.y, 16, 260);
    }
    ctx.shake = Math.max(ctx.shake || 0, shake + (hits > 2 ? 0.4 : 0));
    if (hits >= 3) ctx.triggerSlowMo?.(0.45, 0.3);
  }

  function chainsaw(m) {
    ctx.sfx.chainsaw();
    const hit = Query.region(ctx.world.bodies, {
      min: { x: m.x - 36, y: m.y - 36 },
      max: { x: m.x + 36, y: m.y + 36 },
    });
    for (const b of hit) {
      if (!b.plugin?.person) continue;
      if (Vector.magnitude(Vector.sub(b.position, m)) > 40) continue;
      ctx.damagePart(b.plugin.person, b.plugin.part, 7 + Math.random() * 6, b.position, ctx);
      // chance to force sever on low hp limbs
      const p = b.plugin.person;
      const part = b.plugin.part;
      if (p.hp[part] < 12 && part !== 'torso' && part !== 'head' && Math.random() < 0.25) {
        ctx.damagePart(p, part, 99, b.position, ctx);
      }
      Body.applyForce(b, b.position, {
        x: (Math.random() - 0.5) * 0.004,
        y: (Math.random() - 0.5) * 0.004,
      });
      ctx.fx.blood(b.position.x, b.position.y, 6, 180);
      ctx.fx.sparks(m.x, m.y, 2);
    }
  }

  function fireRocket(m) {
    const aim = aimDir(m);
    const body = Bodies.rectangle(aim.ox, aim.oy, 18, 8, {
      label: 'rocket',
      frictionAir: 0.005,
      density: 0.003,
    });
    Body.setAngle(body, Math.atan2(aim.y, aim.x));
    Body.setVelocity(body, { x: aim.x * 16, y: aim.y * 16 });
    body.plugin = { rocket: true, life: 2.5 };
    Composite.add(ctx.world, body);
    projectiles.push(body);
    ctx.sfx.shoot();
  }

  function explode(x, y, radius, dmg) {
    ctx.sfx.explode();
    ctx.fx.flash(x, y, radius * 1.15, 'rgba(255,160,60,0.6)', 0.28);
    ctx.fx.smoke(x, y, 18);
    ctx.fx.fire(x, y, 22);
    ctx.fx.sparks(x, y, 24);
    ctx.fx.gib(x, y, 10);
    ctx.shake = Math.max(ctx.shake || 0, 2.2);
    ctx.stats.chaos += 100;
    ctx.triggerSlowMo?.(0.4, 0.35);
    ctx.registerHit?.(40, { x, y });

    for (const b of ctx.world.bodies) {
      if (b.isStatic && b.label !== 'spike') continue;
      const d = Vector.magnitude(Vector.sub(b.position, { x, y }));
      if (d > radius || d < 0.1) continue;
      const falloff = 1 - d / radius;
      const force = falloff * 0.11;
      const dir = Vector.normalise(Vector.sub(b.position, { x, y }));
      Body.applyForce(b, b.position, { x: dir.x * force, y: dir.y * force - 0.015 });
      Body.setAngularVelocity(b, b.angularVelocity + (Math.random() - 0.5) * 0.4 * falloff);
      if (b.plugin?.person) {
        ctx.damagePart(b.plugin.person, b.plugin.part, dmg * falloff, b.position, ctx);
        if (falloff > 0.5 && Math.random() < 0.4) {
          b.plugin.person.onFire = Math.max(b.plugin.person.onFire, 2.2 + Math.random() * 2);
        }
      }
    }
  }

  function throwGrenade(m) {
    const aim = aimDir(m);
    const body = Bodies.circle(aim.ox, aim.oy, 8, {
      label: 'grenade',
      density: 0.002,
      restitution: 0.4,
      friction: 0.6,
    });
    Body.setVelocity(body, { x: aim.x * 12, y: aim.y * 12 - 3 });
    body.plugin = { grenade: true, fuse: 1.4 };
    Composite.add(ctx.world, body);
    projectiles.push(body);
    ctx.sfx.mine();
  }

  function placeMine(m) {
    const body = Bodies.circle(m.x, m.y, 10, {
      label: 'mine',
      isStatic: true,
      density: 0.01,
    });
    body.plugin = { mine: true, armed: 0.4 };
    Composite.add(ctx.world, body);
    hazards.push(body);
    ctx.sfx.mine();
    ctx.fx.floatText(m.x, m.y - 16, 'ARMED', '#ffb020');
  }

  function flamethrower(m) {
    const aim = aimDir(m);
    ctx.sfx.flame();
    for (let i = 0; i < 3; i++) {
      const ang = Math.atan2(aim.y, aim.x) + (Math.random() - 0.5) * 0.35;
      const dist = 40 + Math.random() * 90;
      const px = aim.ox + Math.cos(ang) * dist;
      const py = aim.oy + Math.sin(ang) * dist;
      ctx.fx.fire(px, py, 5);
      const hit = Query.region(ctx.world.bodies, {
        min: { x: px - 18, y: py - 18 },
        max: { x: px + 18, y: py + 18 },
      });
      for (const b of hit) {
        if (!b.plugin?.person) continue;
        ctx.damagePart(b.plugin.person, b.plugin.part, 2.5, b.position, ctx);
        b.plugin.person.onFire = Math.max(b.plugin.person.onFire, 2.5);
        Body.applyForce(b, b.position, { x: Math.cos(ang) * 0.0015, y: Math.sin(ang) * 0.0015 });
      }
    }
  }

  function laser(m) {
    const aim = aimDir(m);
    ctx.sfx.laser();
    const x2 = aim.ox + aim.x * 1400;
    const y2 = aim.oy + aim.y * 1400;
    beams.push({ x1: aim.ox, y1: aim.oy, x2, y2, life: 0.08, color: '#ff2d55' });

    // raycast-ish sample
    for (let t = 0; t < 1; t += 0.02) {
      const px = aim.ox + (x2 - aim.ox) * t;
      const py = aim.oy + (y2 - aim.oy) * t;
      const hit = Query.point(ctx.world.bodies, { x: px, y: py });
      for (const b of hit) {
        if (b.isStatic && b.label === 'wall') return;
        if (b.plugin?.person) {
          ctx.damagePart(b.plugin.person, b.plugin.part, 12, { x: px, y: py }, ctx);
          ctx.fx.sparks(px, py, 3);
          ctx.fx.blood(px, py, 4, 100);
          // stop at first person for thicker beam feel? continue for pierce
        }
      }
    }
  }

  function lightning(m) {
    ctx.sfx.zap();
    ctx.fx.flash(m.x, m.y, 120, 'rgba(180,220,255,0.5)', 0.2);
    beams.push({
      x1: m.x + (Math.random() - 0.5) * 40,
      y1: ctx.cam.y - 20,
      x2: m.x,
      y2: m.y,
      life: 0.15,
      color: '#a8e7ff',
      jagged: true,
    });
    const targets = [];
    for (const person of ctx.people) {
      const t = person.parts.torso || person.parts.head;
      if (!t) continue;
      const d = Vector.magnitude(Vector.sub(t.position, m));
      if (d < 160) targets.push({ person, body: t, d });
    }
    targets.sort((a, b) => a.d - b.d);
    let prev = m;
    for (const t of targets.slice(0, 4)) {
      beams.push({
        x1: prev.x, y1: prev.y,
        x2: t.body.position.x, y2: t.body.position.y,
        life: 0.12, color: '#7fd0ff', jagged: true,
      });
      for (const [name, body] of Object.entries(t.person.parts)) {
        ctx.damagePart(t.person, name, 14, body.position, ctx);
        Body.applyForce(body, body.position, {
          x: (Math.random() - 0.5) * 0.01,
          y: -0.008,
        });
      }
      t.person.onFire = Math.max(t.person.onFire, 0.8);
      prev = t.body.position;
      ctx.fx.sparks(t.body.position.x, t.body.position.y, 10);
    }
    // ground zap damage at cursor
    const hit = Query.region(ctx.world.bodies, {
      min: { x: m.x - 50, y: m.y - 50 },
      max: { x: m.x + 50, y: m.y + 50 },
    });
    for (const b of hit) {
      if (b.plugin?.person) {
        ctx.damagePart(b.plugin.person, b.plugin.part, 22, b.position, ctx);
      }
    }
  }

  function dropAnvil(m) {
    const body = Bodies.rectangle(m.x, ctx.cam.y + 30, 50, 36, {
      label: 'anvil',
      density: 0.05,
      friction: 0.9,
      restitution: 0.05,
    });
    body.plugin = { anvil: true, life: 8 };
    Composite.add(ctx.world, body);
    projectiles.push(body);
    ctx.sfx.thwack();
    ctx.fx.floatText(m.x, ctx.cam.y + 50, 'ANVIL', '#ccc');
  }

  function placeSpikes(m) {
    const floorY = ctx.floorY;
    for (let i = -2; i <= 2; i++) {
      const body = Bodies.polygon(m.x + i * 22, floorY - 14, 3, 14, {
        label: 'spike',
        isStatic: true,
        angle: -Math.PI / 2,
        restitution: 0.1,
      });
      body.plugin = { spike: true };
      Composite.add(ctx.world, body);
      hazards.push(body);
    }
    ctx.sfx.mine();
    ctx.fx.floatText(m.x, floorY - 40, 'SPIKES', '#ff6b81');
  }

  function slice(m) {
    ctx.sfx.sever();
    beams.push({ x1: m.x, y1: m.y - 200, x2: m.x, y2: m.y + 200, life: 0.2, color: '#ffffff', wide: 3 });
    const hit = Query.region(ctx.world.bodies, {
      min: { x: m.x - 14, y: m.y - 200 },
      max: { x: m.x + 14, y: m.y + 200 },
    });
    for (const b of hit) {
      if (!b.plugin?.person) continue;
      // huge damage to force sever on limbs
      const part = b.plugin.part;
      ctx.damagePart(b.plugin.person, part, part === 'torso' ? 40 : 99, b.position, ctx);
      Body.setVelocity(b, {
        x: b.velocity.x + (b.position.x < m.x ? -8 : 8),
        y: b.velocity.y - 2,
      });
      ctx.fx.blood(b.position.x, b.position.y, 16, 260);
    }
    ctx.shake = Math.max(ctx.shake, 0.8);
  }

  function blackHole(m) {
    ctx.sfx.zap();
    const hole = {
      x: m.x, y: m.y,
      life: 2.2,
      r: 160,
      pull: true,
    };
    hazards.push(hole);
    ctx.fx.floatText(m.x, m.y - 20, 'SINGULARITY', '#c44dff');
    ctx.stats.chaos += 50;
  }

  function update(dt) {
    // projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const b = projectiles[i];
      const pl = b.plugin || {};
      if (pl.bullet) {
        pl.life -= dt;
        // hit check
        const hits = Query.region(ctx.world.bodies, {
          min: { x: b.position.x - 8, y: b.position.y - 8 },
          max: { x: b.position.x + 8, y: b.position.y + 8 },
        });
        let dead = pl.life <= 0;
        for (const h of hits) {
          if (h === b) continue;
          if (h.label === 'bullet' || h.label === 'rocket') continue;
          if (h.isStatic && h.label === 'wall') { dead = true; break; }
          if (h.plugin?.person) {
            ctx.damagePart(h.plugin.person, h.plugin.part, pl.dmg, b.position, ctx);
            Body.applyForce(h, h.position, {
              x: b.velocity.x * 0.0008,
              y: b.velocity.y * 0.0008,
            });
            ctx.fx.blood(b.position.x, b.position.y, 8, 200);
            ctx.sfx.hit();
            dead = true;
            break;
          }
        }
        if (dead) {
          Composite.remove(ctx.world, b);
          projectiles.splice(i, 1);
        }
      } else if (pl.rocket) {
        pl.life -= dt;
        Body.applyForce(b, b.position, {
          x: Math.cos(b.angle) * 0.004,
          y: Math.sin(b.angle) * 0.004,
        });
        ctx.fx.smoke(b.position.x, b.position.y, 1);
        const hits = Query.region(ctx.world.bodies, {
          min: { x: b.position.x - 12, y: b.position.y - 12 },
          max: { x: b.position.x + 12, y: b.position.y + 12 },
        });
        let boom = pl.life <= 0;
        for (const h of hits) {
          if (h === b) continue;
          if (h.plugin?.person || (h.isStatic && h.label === 'wall') || h.label === 'anvil') {
            boom = true;
            break;
          }
        }
        if (boom) {
          explode(b.position.x, b.position.y, 140, 70);
          Composite.remove(ctx.world, b);
          projectiles.splice(i, 1);
        }
      } else if (pl.grenade) {
        pl.fuse -= dt;
        if (pl.fuse <= 0) {
          explode(b.position.x, b.position.y, 120, 60);
          Composite.remove(ctx.world, b);
          projectiles.splice(i, 1);
        }
      } else if (pl.anvil) {
        pl.life -= dt;
        if (pl.life <= 0 || b.position.y > ctx.floorY + 400) {
          Composite.remove(ctx.world, b);
          projectiles.splice(i, 1);
        }
      }
    }

    // hazards
    for (let i = hazards.length - 1; i >= 0; i--) {
      const h = hazards[i];
      if (h.pull) {
        // black hole
        h.life -= dt;
        ctx.fx.burst(h.x, h.y, '#c44dff', 2, 40, 0.3);
        for (const b of ctx.world.bodies) {
          if (b.isStatic) continue;
          const d = Vector.magnitude(Vector.sub(b.position, h));
          if (d > h.r || d < 4) continue;
          const dir = Vector.normalise(Vector.sub(h, b.position));
          const f = (1 - d / h.r) * 0.012;
          Body.applyForce(b, b.position, { x: dir.x * f, y: dir.y * f });
          if (b.plugin?.person && d < 40) {
            ctx.damagePart(b.plugin.person, b.plugin.part, 8 * dt, b.position, ctx);
          }
        }
        if (h.life <= 0) {
          explode(h.x, h.y, 100, 40);
          hazards.splice(i, 1);
        }
        continue;
      }

      if (h.plugin?.mine) {
        if (h.plugin.armed > 0) h.plugin.armed -= dt;
        else {
          const hits = Query.region(ctx.world.bodies, {
            min: { x: h.position.x - 24, y: h.position.y - 24 },
            max: { x: h.position.x + 24, y: h.position.y + 24 },
          });
          for (const b of hits) {
            if (b.plugin?.person) {
              explode(h.position.x, h.position.y, 110, 55);
              Composite.remove(ctx.world, h);
              hazards.splice(i, 1);
              break;
            }
          }
        }
      }
    }

    // beams
    for (let i = beams.length - 1; i >= 0; i--) {
      beams[i].life -= dt;
      if (beams[i].life <= 0) beams.splice(i, 1);
    }

    // spike contact
    for (const b of ctx.world.bodies) {
      if (!b.plugin?.person) continue;
      const near = Query.region(ctx.world.bodies, {
        min: { x: b.position.x - 12, y: b.position.y - 12 },
        max: { x: b.position.x + 12, y: b.position.y + 12 },
      });
      for (const o of near) {
        if (o.plugin?.spike) {
          ctx.damagePart(b.plugin.person, b.plugin.part, 25 * dt, b.position, ctx);
          if (Math.random() < 0.1) ctx.fx.blood(b.position.x, b.position.y, 2, 30);
        }
        if (o.plugin?.anvil && Vector.magnitude(o.velocity) > 4) {
          ctx.damagePart(b.plugin.person, b.plugin.part, 8, b.position, ctx);
        }
      }
    }
  }

  function drawSprite(c, img, w, h) {
    if (img) {
      c.drawImage(img, -w / 2, -h / 2, w, h);
      return true;
    }
    return false;
  }

  function draw(c, cam) {
    // rockets / grenades / anvils / bullets
    for (const b of projectiles) {
      const x = b.position.x - cam.x;
      const y = b.position.y - cam.y;
      c.save();
      c.translate(x, y);
      c.rotate(b.angle);
      if (b.plugin?.rocket) {
        if (!drawSprite(c, SPRITES?.prop_rocket || SPRITES?.tool_rocket, 36, 36)) {
          c.fillStyle = '#ff6b3d';
          c.fillRect(-10, -4, 20, 8);
        }
      } else if (b.plugin?.grenade) {
        if (!drawSprite(c, SPRITES?.prop_grenade || SPRITES?.tool_grenade, 28, 28)) {
          c.fillStyle = '#3dff9a';
          c.beginPath(); c.arc(0, 0, 8, 0, Math.PI * 2); c.fill();
        }
      } else if (b.plugin?.anvil) {
        if (!drawSprite(c, SPRITES?.prop_anvil || SPRITES?.tool_anvil, 56, 44)) {
          c.fillStyle = '#5a6270';
          c.fillRect(-25, -16, 50, 32);
        }
      } else if (b.plugin?.bullet) {
        c.fillStyle = '#ffd166';
        c.beginPath(); c.arc(0, 0, 3, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    }

    for (const h of hazards) {
      if (h.pull) {
        const x = h.x - cam.x;
        const y = h.y - cam.y;
        const hole = SPRITES?.tool_hole;
        if (hole) {
          c.globalAlpha = 0.85;
          c.drawImage(hole, x - 48, y - 48, 96, 96);
          c.globalAlpha = 1;
        }
        const g = c.createRadialGradient(x, y, 4, x, y, h.r);
        g.addColorStop(0, 'rgba(40,0,60,0.55)');
        g.addColorStop(0.5, 'rgba(120,40,200,0.2)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y, h.r, 0, Math.PI * 2);
        c.fill();
        continue;
      }
      if (h.plugin?.mine) {
        const x = h.position.x - cam.x;
        const y = h.position.y - cam.y;
        const img = SPRITES?.prop_mine || SPRITES?.tool_mine;
        if (img) {
          c.globalAlpha = h.plugin.armed > 0 ? 0.55 : 1;
          c.drawImage(img, x - 18, y - 18, 36, 36);
          c.globalAlpha = 1;
        } else {
          c.fillStyle = h.plugin.armed > 0 ? '#666' : '#ff3d5a';
          c.beginPath();
          c.arc(x, y, 10, 0, Math.PI * 2);
          c.fill();
        }
      }
      if (h.plugin?.spike) {
        const x = h.position.x - cam.x;
        const y = h.position.y - cam.y;
        const img = SPRITES?.prop_spikes || SPRITES?.tool_spikes;
        c.save();
        c.translate(x, y);
        c.rotate(h.angle + Math.PI / 2);
        if (img) {
          c.drawImage(img, -16, -16, 32, 32);
        } else {
          c.fillStyle = '#9aa0aa';
          c.beginPath();
          c.moveTo(0, -14);
          c.lineTo(10, 10);
          c.lineTo(-10, 10);
          c.closePath();
          c.fill();
        }
        c.restore();
      }
    }

    for (const b of beams) {
      c.save();
      c.strokeStyle = b.color;
      c.lineWidth = b.wide || (b.jagged ? 2 : 2.5);
      c.globalAlpha = Math.max(0, b.life * 8);
      c.shadowColor = b.color;
      c.shadowBlur = 12;
      c.beginPath();
      if (b.jagged) {
        const steps = 8;
        c.moveTo(b.x1 - cam.x, b.y1 - cam.y);
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const x = b.x1 + (b.x2 - b.x1) * t + (i < steps ? (Math.random() - 0.5) * 24 : 0);
          const y = b.y1 + (b.y2 - b.y1) * t + (i < steps ? (Math.random() - 0.5) * 24 : 0);
          c.lineTo(x - cam.x, y - cam.y);
        }
      } else {
        c.moveTo(b.x1 - cam.x, b.y1 - cam.y);
        c.lineTo(b.x2 - cam.x, b.y2 - cam.y);
      }
      c.stroke();
      c.restore();
    }
  }

  function clear() {
    for (const b of projectiles) {
      try { Composite.remove(ctx.world, b); } catch {}
    }
    projectiles.length = 0;
    for (const h of hazards) {
      if (h.position) {
        try { Composite.remove(ctx.world, h); } catch {}
      }
    }
    hazards.length = 0;
    beams.length = 0;
  }

  return { use, update, draw, clear, explode, TOOLS };
}
