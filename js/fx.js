/** Blood, sparks, smoke, shockwaves, floor decals, gibs. */

export function createFx() {
  const particles = [];
  const floats = [];
  const flashes = [];
  const decals = []; // floor blood stains
  const trails = [];
  const maxDecals = 180;

  function burst(x, y, color, n = 12, speed = 180, life = 0.6, opts = {}) {
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

  function blood(x, y, n = 18, speed = 220) {
    burst(x, y, '#c4122f', n, speed, 0.9, { r0: 2, r1: 5 });
    burst(x, y, '#7a0a1c', Math.floor(n * 0.45), speed * 0.65, 1.15, { r0: 1.5, r1: 4 });
    burst(x, y, '#ff2d55', Math.floor(n * 0.2), speed * 1.1, 0.4, { r0: 1, r1: 2, g: 200 });
    // floor stain
    if (Math.random() < 0.7) decal(x, y + 8 + Math.random() * 12, 10 + Math.random() * 22);
  }

  function decal(x, y, r = 16) {
    decals.push({
      x: x + (Math.random() - 0.5) * 10,
      y,
      r,
      rot: Math.random() * Math.PI * 2,
      a: 0.35 + Math.random() * 0.35,
      life: 1,
    });
    if (decals.length > maxDecals) decals.shift();
  }

  function sparks(x, y, n = 10) {
    burst(x, y, '#ffd166', n, 280, 0.4, { r0: 1, r1: 2.5, g: 80, glow: true });
    burst(x, y, '#fff', Math.floor(n / 2), 200, 0.22, { r0: 0.8, r1: 1.8, g: 40, glow: true });
  }

  function smoke(x, y, n = 8) {
    for (let i = 0; i < n; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 40,
        vy: -30 - Math.random() * 60,
        r: 6 + Math.random() * 16,
        life: 0.9 + Math.random() * 0.7,
        max: 1.4,
        color: `rgba(${70 + Math.random() * 30},${75 + Math.random() * 20},${85},${0.3 + Math.random() * 0.25})`,
        g: -25,
        drag: 0.96,
        smoke: true,
      });
    }
  }

  function fire(x, y, n = 10) {
    for (let i = 0; i < n; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 100,
        vy: -90 - Math.random() * 140,
        r: 3 + Math.random() * 7,
        life: 0.28 + Math.random() * 0.35,
        max: 0.55,
        color: Math.random() > 0.45 ? '#ff6b3d' : '#ffd166',
        g: -50,
        drag: 0.93,
        glow: true,
      });
    }
  }

  function gib(x, y, n = 6) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 140 + Math.random() * 220;
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 80,
        r: 2.5 + Math.random() * 4,
        life: 1.1 + Math.random() * 0.5,
        max: 1.5,
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
    trails.push({ x, y, color, life: 0.25, r: 3 + Math.random() * 3 });
  }

  function floatText(x, y, text, color = '#fff', scale = 1) {
    floats.push({ x, y, text, color, life: 1.05, max: 1.05, vy: -50, scale });
  }

  function flash(x, y, r = 80, color = 'rgba(255,220,180,0.45)', life = 0.18) {
    flashes.push({ x, y, r, color, life, max: life });
  }

  function clearDecals() { decals.length = 0; }

  function update(dt, floorY) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        if (p.gib || (p.color && String(p.color).includes('c412'))) {
          if (floorY != null && p.y > floorY - 30) decal(p.x, floorY - 2, 6 + Math.random() * 10);
        }
        particles.splice(i, 1);
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
        p.vy *= -0.25;
        p.vx *= 0.7;
        if (Math.random() < 0.15 && !p.smoke) decal(p.x, floorY - 1, 4 + Math.random() * 8);
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

  function drawDecals(ctx, cam) {
    for (const d of decals) {
      ctx.save();
      ctx.translate(d.x - cam.x, d.y - cam.y);
      ctx.rotate(d.rot);
      ctx.globalAlpha = d.a;
      ctx.fillStyle = '#5a0818';
      ctx.beginPath();
      ctx.ellipse(0, 0, d.r, d.r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a1028';
      ctx.beginPath();
      ctx.ellipse(-d.r * 0.2, 0, d.r * 0.5, d.r * 0.22, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function draw(ctx, cam) {
    for (const t of trails) {
      ctx.globalAlpha = Math.max(0, t.life * 3);
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(t.x - cam.x, t.y - cam.y, t.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const f of flashes) {
      const a = f.life / f.max;
      const g = ctx.createRadialGradient(f.x - cam.x, f.y - cam.y, 0, f.x - cam.x, f.y - cam.y, f.r);
      g.addColorStop(0, f.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = a;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x - cam.x, f.y - cam.y, f.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    for (const p of particles) {
      const a = Math.max(0, p.life / p.max);
      ctx.save();
      ctx.globalAlpha = a;
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
      }
      ctx.fillStyle = p.color;
      const x = p.x - cam.x;
      const y = p.y - cam.y;
      if (p.gib) {
        ctx.translate(x, y);
        ctx.rotate(p.ang || 0);
        ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
      } else {
        ctx.beginPath();
        ctx.arc(x, y, p.smoke ? p.r * (1.3 - a * 0.4) : p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of floats) {
      const t = f.life / (f.max || 1);
      const sc = (f.scale || 1) * (0.85 + (1 - t) * 0.4);
      ctx.save();
      ctx.globalAlpha = Math.max(0, t);
      ctx.translate(f.x - cam.x, f.y - cam.y);
      ctx.scale(sc, sc);
      ctx.font = '800 14px Orbitron, sans-serif';
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
    floatText, flash, decal, clearDecals, update, draw, drawDecals,
  };
}
