/** Blood, sparks, smoke, shockwaves, floor decals, gibs — with particle budgets. */

export function createFx() {
  const particles = [];
  const floats = [];
  const flashes = [];
  const decals = [];
  const trails = [];
  let maxDecals = 120;
  let maxParticles = 280;
  let quality = 1; // 0.25–1 scales spawn counts

  function setLoad(inmateCount) {
    // Scale FX budget with world pressure
    if (inmateCount > 22) {
      quality = 0.25;
      maxParticles = 90;
      maxDecals = 50;
    } else if (inmateCount > 16) {
      quality = 0.4;
      maxParticles = 140;
      maxDecals = 70;
    } else if (inmateCount > 10) {
      quality = 0.65;
      maxParticles = 200;
      maxDecals = 100;
    } else {
      quality = 1;
      maxParticles = 280;
      maxDecals = 120;
    }
    while (particles.length > maxParticles) particles.shift();
    while (decals.length > maxDecals) decals.shift();
  }

  function q(n) {
    return Math.max(0, Math.round(n * quality));
  }

  function burst(x, y, color, n = 12, speed = 180, life = 0.6, opts = {}) {
    n = q(n);
    if (n <= 0) return;
    if (particles.length > maxParticles - n) {
      particles.splice(0, particles.length - (maxParticles - n));
    }
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.9);
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 40,
        r: (opts.r0 || 1.5) + Math.random() * (opts.r1 || 3.5),
        life,
        max: life,
        color,
        g: opts.g != null ? opts.g : 420 + Math.random() * 200,
        drag: opts.drag || 0.985,
        glow: !!opts.glow,
      });
    }
  }

  function blood(x, y, n = 18, speed = 220, color = null) {
    n = q(n);
    if (n <= 0) {
      if (Math.random() < 0.4) decal(x, y + 6, 8, color);
      return;
    }
    const c0 = color || '#c4122f';
    const c1 = color || '#7a0a1c';
    const c2 = color || '#ff2d55';
    burst(x, y, c0, n, speed, 0.85, { r0: 2, r1: 5 });
    if (quality > 0.5) {
      burst(x, y, c1, Math.floor(n * 0.4), speed * 0.65, 1.0, { r0: 1.5, r1: 4 });
    }
    if (quality > 0.7) {
      burst(x, y, c2, Math.floor(n * 0.15), speed * 1.1, 0.35, { r0: 1, r1: 2, g: 200 });
    }
    if (Math.random() < 0.5 * quality + 0.2) decal(x, y + 8 + Math.random() * 12, 10 + Math.random() * 18, color);
  }

  function decal(x, y, r = 16, color = null) {
    if (decals.length >= maxDecals) decals.shift();
    decals.push({
      x: x + (Math.random() - 0.5) * 10,
      y,
      r,
      rot: Math.random() * Math.PI * 2,
      a: 0.3 + Math.random() * 0.3,
      color: color || null,
    });
  }

  function sparks(x, y, n = 10) {
    burst(x, y, '#ffd166', n, 260, 0.35, { r0: 1, r1: 2.5, g: 80, glow: true });
    if (quality > 0.5) burst(x, y, '#fff', Math.floor(n / 2), 180, 0.2, { r0: 0.8, r1: 1.8, g: 40, glow: true });
  }

  function smoke(x, y, n = 8) {
    n = q(n);
    for (let i = 0; i < n; i++) {
      if (particles.length >= maxParticles) break;
      particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 40,
        vy: -30 - Math.random() * 60,
        r: 6 + Math.random() * 14,
        life: 0.7 + Math.random() * 0.5,
        max: 1.2,
        color: `rgba(${70 + Math.random() * 30},${75},${85},${0.3 + Math.random() * 0.2})`,
        g: -25,
        drag: 0.96,
        smoke: true,
      });
    }
  }

  function fire(x, y, n = 10) {
    n = q(n);
    for (let i = 0; i < n; i++) {
      if (particles.length >= maxParticles) break;
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 90,
        vy: -80 - Math.random() * 120,
        r: 3 + Math.random() * 6,
        life: 0.22 + Math.random() * 0.28,
        max: 0.5,
        color: Math.random() > 0.5 ? '#ff6b3d' : '#ffd166',
        g: -50,
        drag: 0.93,
        glow: true,
      });
    }
  }

  function gib(x, y, n = 6) {
    n = q(n);
    for (let i = 0; i < n; i++) {
      if (particles.length >= maxParticles) break;
      const a = Math.random() * Math.PI * 2;
      const s = 140 + Math.random() * 200;
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 80,
        r: 2.5 + Math.random() * 4,
        life: 0.9 + Math.random() * 0.4,
        max: 1.3,
        color: Math.random() > 0.5 ? '#a01028' : '#e8b896',
        g: 520,
        drag: 0.99,
        gib: true,
        spin: (Math.random() - 0.5) * 12,
        ang: Math.random() * 6,
      });
    }
  }

  function trail(x, y, color = 'rgba(255,80,100,0.5)') {
    if (quality < 0.4 || trails.length > 40) return;
    trails.push({ x, y, color, life: 0.2, r: 3 + Math.random() * 2 });
  }

  function floatText(x, y, text, color = '#fff', scale = 1) {
    if (floats.length > 24) floats.shift();
    floats.push({ x, y, text, color, life: 0.95, max: 0.95, vy: -50, scale });
  }

  function flash(x, y, r = 80, color = 'rgba(255,220,180,0.45)', life = 0.18) {
    if (quality < 0.35 && flashes.length > 2) return;
    if (flashes.length > 8) flashes.shift();
    flashes.push({ x, y, r, color, life, max: life });
  }

  function clearDecals() { decals.length = 0; particles.length = 0; floats.length = 0; flashes.length = 0; trails.length = 0; }

  function update(dt, floorY) {
    // Reverse iterate without splice-in-loop thrash when many: compact periodically
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        if (quality > 0.5 && floorY != null && p.y > floorY - 30 && (p.gib || (p.color && String(p.color).includes('c412')))) {
          if (Math.random() < 0.3) decal(p.x, floorY - 2, 5 + Math.random() * 8);
        }
        particles[i] = particles[particles.length - 1];
        particles.pop();
        continue;
      }
      p.vy += p.g * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.spin) p.ang = (p.ang || 0) + p.spin * dt;
      if (floorY != null && p.y > floorY - 4 && p.vy > 0) {
        p.y = floorY - 4;
        p.vy *= -0.2;
        p.vx *= 0.65;
      }
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      f.life -= dt;
      if (f.life <= 0) { floats.splice(i, 1); continue; }
      f.y += f.vy * dt;
      f.vy *= 0.98;
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      flashes[i].life -= dt;
      if (flashes[i].life <= 0) flashes.splice(i, 1);
    }
    for (let i = trails.length - 1; i >= 0; i--) {
      trails[i].life -= dt;
      if (trails[i].life <= 0) trails.splice(i, 1);
    }
  }

  function drawDecals(ctx, cam, viewW, viewH) {
    const m = 40;
    for (const d of decals) {
      const x = d.x - cam.x;
      const y = d.y - cam.y;
      if (viewW && (x < -m || x > viewW + m || y < -m || y > viewH + m)) continue;
      ctx.globalAlpha = d.a;
      ctx.fillStyle = d.color || '#5a0818';
      ctx.beginPath();
      ctx.ellipse(x, y, d.r, d.r * 0.45, d.rot, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function draw(ctx, cam, viewW, viewH) {
    const m = 50;
    for (const t of trails) {
      const x = t.x - cam.x;
      const y = t.y - cam.y;
      if (viewW && (x < -m || x > viewW + m)) continue;
      ctx.globalAlpha = Math.max(0, t.life * 3);
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(x, y, t.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const f of flashes) {
      const a = f.life / f.max;
      const x = f.x - cam.x;
      const y = f.y - cam.y;
      const g = ctx.createRadialGradient(x, y, 0, x, y, f.r);
      g.addColorStop(0, f.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = a;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const p of particles) {
      const x = p.x - cam.x;
      const y = p.y - cam.y;
      if (viewW && (x < -m || x > viewW + m || y < -m || y > viewH + m)) continue;
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.gib) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.ang || 0);
        ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, p.smoke ? p.r * (1.2 - a * 0.3) : p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of floats) {
      const t = f.life / (f.max || 1);
      const sc = (f.scale || 1) * (0.85 + (1 - t) * 0.35);
      ctx.save();
      ctx.globalAlpha = Math.max(0, t);
      ctx.translate(f.x - cam.x, f.y - cam.y);
      ctx.scale(sc, sc);
      ctx.font = '800 13px "IBM Plex Sans", sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  return {
    particles, decals, burst, blood, sparks, smoke, fire, gib, trail,
    floatText, flash, decal, clearDecals, update, draw, drawDecals, setLoad,
  };
}
