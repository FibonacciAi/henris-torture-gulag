/**
 * Arena maps for Henri's Torture Gulag.
 * Big playgrounds: arctic, hellscape, candy, moon, jungle, carnival, gulag.
 */

function getBodies() {
  return globalThis.Matter?.Bodies;
}

export const WORLD_W = 5600;
export const WORLD_H = 1600;

/** Shared static body options — sticky floor, no bounce (helps standing + less tunnel). */
function wallOpts(extra = {}) {
  return {
    isStatic: true,
    label: 'wall',
    friction: 1.05,
    restitution: 0,
    slop: 0.02,
    ...extra,
  };
}

function propOpts(extra = {}) {
  return {
    isStatic: true,
    label: 'prop',
    friction: 0.9,
    restitution: 0.02,
    slop: 0.03,
    ...extra,
  };
}

function rect(x, y, w, h, opts) {
  const Bodies = getBodies();
  if (!Bodies) throw new Error('Matter.js failed to load');
  return Bodies.rectangle(x, y, w, h, opts);
}

/** Bounds: thick floor slab (anti-tunnel), walls, ceiling. */
function makeShell(floorY) {
  const thick = 200;
  const floor = rect(WORLD_W / 2, floorY + thick / 2 - 4, WORLD_W + 1200, thick, wallOpts({ label: 'wall' }));
  // Extra thin "skin" on top with high friction for feet
  const floorSkin = rect(WORLD_W / 2, floorY + 6, WORLD_W + 1200, 20, wallOpts({ label: 'wall' }));
  const ceil = rect(WORLD_W / 2, -80, WORLD_W + 1200, 160, wallOpts());
  const left = rect(-80, WORLD_H / 2, 160, WORLD_H + 600, wallOpts());
  const right = rect(WORLD_W + 80, WORLD_H / 2, 160, WORLD_H + 600, wallOpts());
  return [floor, floorSkin, ceil, left, right];
}

/**
 * @typedef {object} MapDef
 * @property {string} id
 * @property {string} name
 * @property {string} emoji
 * @property {string} blurb
 * @property {number} [gravity]
 * @property {{sky0:string,sky1:string,floor:string,accent:string,fog?:string}} colors
 * @property {(floorY:number)=>object[]} buildProps
 * @property {(c:CanvasRenderingContext2D,cam:{x:number,y:number},floorY:number,time:number,sprites:any)=>void} paint
 */

/** @type {MapDef[]} */
export const MAPS = [
  {
    id: 'gulag',
    name: 'GULAG BASEMENT',
    emoji: '🏭',
    blurb: 'Rusty iron. Bad lighting. Classic Henri.',
    gravity: 1.15,
    colors: {
      sky0: '#1a1612',
      sky1: '#0c0a08',
      floor: '#1a1410',
      accent: 'rgba(180,120,40,0.08)',
      fog: 'rgba(12,10,8,0.35)',
    },
    buildProps(floorY) {
      return [
        rect(520, floorY - 70, 240, 22, propOpts()),
        rect(520, floorY - 120, 20, 90, propOpts()),
        rect(1100, floorY - 55, 90, 90, propOpts()),
        rect(1700, floorY - 95, 200, 18, propOpts({ angle: -0.25 })),
        rect(2300, floorY - 70, 110, 55, propOpts()),
        rect(2900, floorY - 130, 260, 16, propOpts({ angle: 0.28 })),
        rect(900, floorY - 280, 160, 16, propOpts()),
        rect(2100, floorY - 340, 140, 16, propOpts()),
        rect(3500, floorY - 90, 180, 20, propOpts()),
        rect(4100, floorY - 200, 200, 16, propOpts()),
        rect(4700, floorY - 80, 100, 70, propOpts()),
        rect(3200, floorY - 380, 150, 16, propOpts()),
      ];
    },
    paint(c, cam, floorY, time, sprites) {
      const bg = sprites?.labBg;
      if (bg) {
        // Cover the *view* height near the floor — not the entire 5600px world
        // (old scale made the photo gigantic and swallowed the characters)
        const coverH = 720;
        const scale = Math.max(coverH / bg.height, 1.1);
        const bw = bg.width * scale;
        const bh = bg.height * scale;
        const parallax = cam.x * 0.2;
        let ox = -((parallax % bw) + bw) % bw;
        const by = floorY - bh + 20 - cam.y;
        while (ox < WORLD_W + bw) {
          c.drawImage(bg, ox - cam.x, by, bw, bh);
          ox += bw - 1;
        }
      } else {
        fillSky(c, cam, floorY, '#2a221c', '#12100c');
      }
      c.fillStyle = `rgba(180,120,40,${0.04 + Math.sin(time * 0.7) * 0.012})`;
      c.fillRect(-cam.x, -100 - cam.y, WORLD_W, floorY + 100);
      c.fillStyle = 'rgba(12,10,8,0.3)';
      c.fillRect(-cam.x, -100 - cam.y, WORLD_W, floorY + 100);
      paintFloorBand(c, cam, floorY, '#14100c', '#2a2018');
      paintGrid(c, cam, floorY, 'rgba(90,40,30,0.2)', 120);
    },
  },

  {
    id: 'arctic',
    name: 'ARCTIC FREEZER',
    emoji: '🧊',
    blurb: 'Slippery ice shelves. Cold chaos. Bring a bat.',
    gravity: 1.1,
    colors: {
      sky0: '#9ec8e8',
      sky1: '#d8eef8',
      floor: '#e8f4fc',
      accent: 'rgba(120,200,255,0.15)',
    },
    buildProps(floorY) {
      return [
        rect(600, floorY - 50, 280, 28, propOpts({ angle: -0.08 })),
        rect(1200, floorY - 140, 220, 24, propOpts()),
        rect(1800, floorY - 70, 160, 80, propOpts()), // iceberg chunk
        rect(2400, floorY - 200, 300, 22, propOpts({ angle: 0.12 })),
        rect(3100, floorY - 90, 200, 24, propOpts()),
        rect(3700, floorY - 280, 180, 20, propOpts()),
        rect(4300, floorY - 120, 260, 26, propOpts({ angle: -0.15 })),
        rect(4900, floorY - 60, 140, 50, propOpts()),
        rect(900, floorY - 320, 140, 18, propOpts()),
        rect(2800, floorY - 380, 160, 18, propOpts()),
        rect(4500, floorY - 360, 120, 16, propOpts()),
      ];
    },
    paint(c, cam, floorY, time) {
      // polar sky
      const g = c.createLinearGradient(0, -cam.y, 0, floorY - cam.y);
      g.addColorStop(0, '#6aa8d4');
      g.addColorStop(0.45, '#b8dcf0');
      g.addColorStop(1, '#eaf6fc');
      c.fillStyle = g;
      c.fillRect(-cam.x - 40, -200 - cam.y, WORLD_W + 80, floorY + 400);

      // sun glow
      c.fillStyle = 'rgba(255,250,220,0.55)';
      c.beginPath();
      c.arc(900 - cam.x * 0.15, 180 - cam.y * 0.1, 70, 0, Math.PI * 2);
      c.fill();

      // distant ice mountains
      c.fillStyle = '#c5e0f0';
      for (let i = 0; i < 14; i++) {
        const mx = i * 420 - (cam.x * 0.18) % 420;
        const mh = 140 + (i % 5) * 40;
        mountain(c, mx - cam.x * 0.0, floorY - cam.y - 20, 380, mh, '#b0d4ea', '#e8f6ff');
      }

      // snow flakes
      c.fillStyle = 'rgba(255,255,255,0.75)';
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 97 + time * (20 + (i % 7))) % WORLD_W);
        const sy = ((i * 53 + time * (30 + i % 11)) % (floorY + 100));
        const r = 1.2 + (i % 3);
        c.beginPath();
        c.arc(sx - cam.x, sy - cam.y, r, 0, Math.PI * 2);
        c.fill();
      }

      paintFloorBand(c, cam, floorY, '#d0e8f5', '#f4fbff');
      // ice cracks
      c.strokeStyle = 'rgba(80,140,180,0.35)';
      c.lineWidth = 2;
      for (let i = 0; i < 18; i++) {
        const x = i * 320 + 40;
        c.beginPath();
        c.moveTo(x - cam.x, floorY - cam.y);
        c.lineTo(x + 40 - cam.x, floorY + 30 - cam.y);
        c.lineTo(x + 90 - cam.x, floorY - cam.y + 8);
        c.stroke();
      }
    },
  },

  {
    id: 'hellscape',
    name: 'HELLSCAPE',
    emoji: '🔥',
    blurb: 'Lava cracks. Ash rain. Absolute nutcase mode.',
    gravity: 1.22,
    colors: {
      sky0: '#2a0a08',
      sky1: '#120404',
      floor: '#1a0806',
      accent: 'rgba(255,80,20,0.12)',
    },
    buildProps(floorY) {
      return [
        rect(500, floorY - 80, 180, 24, propOpts()),
        rect(1000, floorY - 160, 140, 20, propOpts({ angle: 0.2 })),
        rect(1500, floorY - 60, 100, 100, propOpts()), // basalt pillar
        rect(2100, floorY - 220, 240, 18, propOpts()),
        rect(2700, floorY - 100, 200, 22, propOpts({ angle: -0.18 })),
        rect(3300, floorY - 300, 160, 16, propOpts()),
        rect(3900, floorY - 70, 120, 90, propOpts()),
        rect(4500, floorY - 180, 280, 20, propOpts({ angle: 0.1 })),
        rect(5100, floorY - 110, 160, 24, propOpts()),
        rect(800, floorY - 360, 130, 16, propOpts()),
        rect(2500, floorY - 400, 150, 16, propOpts()),
        rect(4200, floorY - 360, 140, 16, propOpts()),
      ];
    },
    paint(c, cam, floorY, time) {
      const g = c.createLinearGradient(0, -cam.y, 0, floorY - cam.y);
      g.addColorStop(0, '#1a0608');
      g.addColorStop(0.5, '#3a100c');
      g.addColorStop(1, '#120404');
      c.fillStyle = g;
      c.fillRect(-cam.x - 40, -200 - cam.y, WORLD_W + 80, floorY + 400);

      // lava glow along floor
      const pulse = 0.35 + Math.sin(time * 3) * 0.12;
      const lg = c.createLinearGradient(0, floorY - 80 - cam.y, 0, floorY + 40 - cam.y);
      lg.addColorStop(0, `rgba(255,60,10,0)`);
      lg.addColorStop(0.6, `rgba(255,80,10,${pulse * 0.35})`);
      lg.addColorStop(1, `rgba(255,40,0,${pulse * 0.55})`);
      c.fillStyle = lg;
      c.fillRect(-cam.x, floorY - 100 - cam.y, WORLD_W, 160);

      // jagged volcano silhouettes
      c.fillStyle = '#0e0404';
      for (let i = 0; i < 10; i++) {
        const mx = i * 580 + 100;
        const mh = 200 + (i % 4) * 80;
        mountain(c, mx - cam.x * 0.2, floorY - cam.y, 500, mh, '#1a0808', '#2a1010');
        // crater glow
        c.fillStyle = `rgba(255,90,20,${0.15 + Math.sin(time * 2 + i) * 0.08})`;
        c.beginPath();
        c.arc(mx - cam.x * 0.2 + 80, floorY - cam.y - mh + 30, 28, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#0e0404';
      }

      // embers
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 137 + time * (15 + i % 9)) % WORLD_W);
        const sy = floorY - ((i * 61 + time * 40) % (floorY * 0.8));
        c.fillStyle = i % 3 === 0 ? 'rgba(255,200,80,0.8)' : 'rgba(255,80,30,0.7)';
        c.fillRect(sx - cam.x, sy - cam.y, 2 + (i % 2), 2 + (i % 2));
      }

      paintFloorBand(c, cam, floorY, '#1a0806', '#3a1810');
      // lava cracks
      c.strokeStyle = `rgba(255,100,20,${0.4 + pulse * 0.3})`;
      c.lineWidth = 3;
      for (let i = 0; i < 20; i++) {
        const x = i * 280 + 30;
        c.beginPath();
        c.moveTo(x - cam.x, floorY - cam.y);
        c.quadraticCurveTo(x + 30 - cam.x, floorY + 20 - cam.y, x + 70 - cam.x, floorY - cam.y);
        c.stroke();
      }
    },
  },

  {
    id: 'candy',
    name: 'CANDY CHAOS',
    emoji: '🍬',
    blurb: 'Frosting floors. Lollipop pillars. Sugar mayhem.',
    gravity: 1.05,
    colors: {
      sky0: '#ffb6d9',
      sky1: '#ffe8f4',
      floor: '#fff0f8',
      accent: 'rgba(255,100,180,0.12)',
    },
    buildProps(floorY) {
      return [
        rect(550, floorY - 70, 200, 30, propOpts()), // cookie
        rect(1100, floorY - 150, 40, 140, propOpts()), // lollipop stick
        rect(1100, floorY - 230, 90, 90, propOpts()), // candy head
        rect(1700, floorY - 90, 220, 28, propOpts({ angle: 0.1 })),
        rect(2300, floorY - 200, 180, 24, propOpts()),
        rect(2900, floorY - 60, 100, 100, propOpts()), // gumdrop
        rect(3500, floorY - 160, 260, 22, propOpts({ angle: -0.12 })),
        rect(4200, floorY - 280, 150, 18, propOpts()),
        rect(4800, floorY - 90, 200, 30, propOpts()),
        rect(800, floorY - 340, 140, 18, propOpts()),
        rect(2600, floorY - 380, 160, 18, propOpts()),
        rect(4600, floorY - 360, 120, 16, propOpts()),
      ];
    },
    paint(c, cam, floorY, time) {
      const g = c.createLinearGradient(0, -cam.y, 0, floorY - cam.y);
      g.addColorStop(0, '#7ec8ff');
      g.addColorStop(0.4, '#ffb6e0');
      g.addColorStop(1, '#ffe8f5');
      c.fillStyle = g;
      c.fillRect(-cam.x - 40, -200 - cam.y, WORLD_W + 80, floorY + 400);

      // candy clouds
      for (let i = 0; i < 12; i++) {
        const cx = i * 480 + 80 - (cam.x * 0.12) % 480;
        const cy = 80 + (i % 4) * 50;
        cloud(c, cx - cam.x * 0, cy - cam.y * 0.3, 60 + (i % 3) * 20, i % 2 ? '#fff0fa' : '#ffffff');
      }

      // floating sprinkles
      const colors = ['#ff4d6d', '#ffd60a', '#7b2cbf', '#00bbf9', '#80ed99'];
      for (let i = 0; i < 50; i++) {
        const sx = ((i * 113 + time * 12) % WORLD_W);
        const sy = ((i * 71 + Math.sin(time + i) * 20) % floorY);
        c.save();
        c.translate(sx - cam.x, sy - cam.y);
        c.rotate(time + i);
        c.fillStyle = colors[i % colors.length];
        c.fillRect(-4, -1.5, 8, 3);
        c.restore();
      }

      paintFloorBand(c, cam, floorY, '#ffd6ea', '#fff5fb');
      // frosting swirls
      c.strokeStyle = 'rgba(255,120,180,0.45)';
      c.lineWidth = 4;
      for (let i = 0; i < 16; i++) {
        const x = i * 350;
        c.beginPath();
        c.arc(x - cam.x, floorY - cam.y + 10, 28, Math.PI, 0);
        c.stroke();
      }
    },
  },

  {
    id: 'moon',
    name: 'MOON BASE',
    emoji: '🌕',
    blurb: 'Low gravity. Craters. Yeet them into orbit.',
    gravity: 0.42,
    colors: {
      sky0: '#050510',
      sky1: '#0a0a18',
      floor: '#2a2a32',
      accent: 'rgba(180,200,255,0.08)',
    },
    buildProps(floorY) {
      return [
        rect(700, floorY - 60, 200, 24, propOpts()),
        rect(1400, floorY - 180, 160, 20, propOpts()),
        rect(2000, floorY - 90, 140, 40, propOpts()),
        rect(2700, floorY - 250, 220, 18, propOpts()),
        rect(3400, floorY - 120, 180, 22, propOpts()),
        rect(4000, floorY - 320, 150, 16, propOpts()),
        rect(4600, floorY - 80, 240, 26, propOpts()),
        rect(1000, floorY - 360, 120, 16, propOpts()),
        rect(3100, floorY - 400, 140, 16, propOpts()),
        rect(5000, floorY - 200, 160, 20, propOpts()),
      ];
    },
    paint(c, cam, floorY, time) {
      c.fillStyle = '#050510';
      c.fillRect(-cam.x - 40, -300 - cam.y, WORLD_W + 80, floorY + 500);

      // stars
      c.fillStyle = '#fff';
      for (let i = 0; i < 120; i++) {
        const sx = (i * 89 * 13) % WORLD_W;
        const sy = (i * 47 * 17) % (floorY * 0.85);
        const a = 0.3 + ((i * 17) % 70) / 100;
        c.globalAlpha = a * (0.7 + 0.3 * Math.sin(time * 2 + i));
        c.fillRect(sx - cam.x, sy - cam.y, 1 + (i % 2), 1 + (i % 2));
      }
      c.globalAlpha = 1;

      // earth in sky
      c.fillStyle = '#3a6ea5';
      c.beginPath();
      c.arc(4800 - cam.x * 0.08, 160 - cam.y * 0.05, 55, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#2d8a4e';
      c.beginPath();
      c.arc(4820 - cam.x * 0.08, 150 - cam.y * 0.05, 18, 0, Math.PI * 2);
      c.fill();

      // crater ground
      paintFloorBand(c, cam, floorY, '#2a2a30', '#3a3a44');
      c.fillStyle = 'rgba(0,0,0,0.25)';
      for (let i = 0; i < 25; i++) {
        const cx = i * 230 + 50;
        const r = 18 + (i % 5) * 10;
        c.beginPath();
        c.ellipse(cx - cam.x, floorY - cam.y - 4, r, r * 0.35, 0, 0, Math.PI * 2);
        c.fill();
      }
    },
  },

  {
    id: 'jungle',
    name: 'DINO JUNGLE',
    emoji: '🦕',
    blurb: 'Vines, ruins, and prehistoric platforms.',
    gravity: 1.12,
    colors: {
      sky0: '#87c96a',
      sky1: '#c8e8a0',
      floor: '#3a5028',
      accent: 'rgba(80,180,40,0.1)',
    },
    buildProps(floorY) {
      return [
        rect(500, floorY - 90, 180, 22, propOpts()),
        rect(1000, floorY - 200, 40, 180, propOpts()), // tree trunk
        rect(1000, floorY - 300, 160, 24, propOpts()), // canopy shelf
        rect(1600, floorY - 120, 200, 20, propOpts({ angle: 0.15 })),
        rect(2200, floorY - 80, 120, 60, propOpts()), // ruin block
        rect(2800, floorY - 240, 220, 18, propOpts()),
        rect(3400, floorY - 100, 180, 22, propOpts({ angle: -0.1 })),
        rect(4000, floorY - 320, 150, 16, propOpts()),
        rect(4600, floorY - 70, 200, 28, propOpts()),
        rect(5200, floorY - 180, 140, 20, propOpts()),
        rect(700, floorY - 380, 130, 16, propOpts()),
        rect(3000, floorY - 400, 140, 16, propOpts()),
      ];
    },
    paint(c, cam, floorY, time) {
      const g = c.createLinearGradient(0, -cam.y, 0, floorY - cam.y);
      g.addColorStop(0, '#5a9ec8');
      g.addColorStop(0.35, '#8ec86a');
      g.addColorStop(1, '#c8e090');
      c.fillStyle = g;
      c.fillRect(-cam.x - 40, -200 - cam.y, WORLD_W + 80, floorY + 400);

      // canopy silhouettes
      for (let i = 0; i < 16; i++) {
        const tx = i * 360 + 40;
        const th = 280 + (i % 4) * 60;
        c.fillStyle = i % 2 ? '#1a4020' : '#245028';
        // trunk
        c.fillRect(tx + 40 - cam.x * 0.22, floorY - th - cam.y, 28, th);
        // foliage blobs
        c.beginPath();
        c.arc(tx + 54 - cam.x * 0.22, floorY - th - cam.y + 20, 70, 0, Math.PI * 2);
        c.arc(tx + 10 - cam.x * 0.22, floorY - th - cam.y + 50, 55, 0, Math.PI * 2);
        c.arc(tx + 100 - cam.x * 0.22, floorY - th - cam.y + 45, 60, 0, Math.PI * 2);
        c.fill();
      }

      // floating leaves
      c.fillStyle = 'rgba(40,120,40,0.55)';
      for (let i = 0; i < 30; i++) {
        const sx = ((i * 127 + time * 18) % WORLD_W);
        const sy = ((i * 59 + time * 25) % floorY);
        c.save();
        c.translate(sx - cam.x, sy - cam.y);
        c.rotate(time + i);
        c.beginPath();
        c.ellipse(0, 0, 8, 3, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }

      paintFloorBand(c, cam, floorY, '#2a4018', '#4a6830');
      // grass tufts
      c.strokeStyle = '#3a8028';
      c.lineWidth = 2;
      for (let i = 0; i < 80; i++) {
        const x = i * 70 + 10;
        c.beginPath();
        c.moveTo(x - cam.x, floorY - cam.y);
        c.lineTo(x - 4 - cam.x, floorY - 12 - cam.y - (i % 5));
        c.moveTo(x - cam.x, floorY - cam.y);
        c.lineTo(x + 5 - cam.x, floorY - 14 - cam.y);
        c.stroke();
      }
    },
  },

  {
    id: 'carnival',
    name: 'HAUNTED CARNIVAL',
    emoji: '🎡',
    blurb: 'Stripes, tents, and midnight midway madness.',
    gravity: 1.1,
    colors: {
      sky0: '#1a1030',
      sky1: '#0c0818',
      floor: '#1a1420',
      accent: 'rgba(255,60,120,0.1)',
    },
    buildProps(floorY) {
      return [
        rect(600, floorY - 100, 160, 22, propOpts()),
        rect(1200, floorY - 70, 80, 120, propOpts()), // ticket booth
        rect(1800, floorY - 180, 240, 20, propOpts()),
        rect(2400, floorY - 90, 200, 24, propOpts({ angle: 0.08 })),
        rect(3000, floorY - 260, 160, 18, propOpts()),
        rect(3600, floorY - 80, 100, 100, propOpts()),
        rect(4200, floorY - 160, 220, 20, propOpts({ angle: -0.12 })),
        rect(4800, floorY - 300, 140, 16, propOpts()),
        rect(900, floorY - 340, 130, 16, propOpts()),
        rect(2700, floorY - 380, 150, 16, propOpts()),
        rect(5100, floorY - 100, 180, 24, propOpts()),
      ];
    },
    paint(c, cam, floorY, time) {
      const g = c.createLinearGradient(0, -cam.y, 0, floorY - cam.y);
      g.addColorStop(0, '#0c0820');
      g.addColorStop(0.5, '#1a1040');
      g.addColorStop(1, '#120818');
      c.fillStyle = g;
      c.fillRect(-cam.x - 40, -200 - cam.y, WORLD_W + 80, floorY + 400);

      // ferris wheel silhouette
      const fx = 3200 - cam.x * 0.15;
      const fy = floorY - 280 - cam.y * 0.1;
      c.strokeStyle = 'rgba(255,80,140,0.35)';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(fx, fy, 160, 0, Math.PI * 2);
      c.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + time * 0.3;
        c.beginPath();
        c.moveTo(fx, fy);
        c.lineTo(fx + Math.cos(a) * 160, fy + Math.sin(a) * 160);
        c.stroke();
      }

      // striped tents
      for (let i = 0; i < 8; i++) {
        const tx = i * 700 + 200;
        const tw = 160;
        const th = 120;
        // stripes
        for (let s = 0; s < 6; s++) {
          c.fillStyle = s % 2 ? '#c02040' : '#f0e8d8';
          c.beginPath();
          c.moveTo(tx - cam.x * 0.25 + s * (tw / 6), floorY - cam.y);
          c.lineTo(tx - cam.x * 0.25 + (s + 1) * (tw / 6), floorY - cam.y);
          c.lineTo(tx - cam.x * 0.25 + tw / 2, floorY - th - cam.y);
          c.closePath();
          c.fill();
        }
      }

      // carnival lights
      for (let i = 0; i < 40; i++) {
        const lx = i * 140 + 20;
        const on = Math.sin(time * 4 + i) > 0;
        c.fillStyle = on ? (i % 3 === 0 ? '#ff4466' : i % 3 === 1 ? '#ffdd44' : '#44aaff') : 'rgba(80,40,60,0.4)';
        c.beginPath();
        c.arc(lx - cam.x, floorY - 40 - cam.y - (i % 5) * 8, 4, 0, Math.PI * 2);
        c.fill();
      }

      paintFloorBand(c, cam, floorY, '#14101a', '#2a2030');
      paintGrid(c, cam, floorY, 'rgba(255,80,140,0.12)', 80);
    },
  },
];

export function getMap(id) {
  return MAPS.find((m) => m.id === id) || MAPS[0];
}

/**
 * Build full static world for a map. Returns { bodies, floorY, map }.
 */
export function buildMapWorld(mapId) {
  const map = getMap(mapId);
  const floorY = WORLD_H - 48;
  const shell = makeShell(floorY);
  const props = map.buildProps(floorY);
  return { map, floorY, bodies: [...shell, ...props] };
}

// ── paint helpers ──

function fillSky(c, cam, floorY, a, b) {
  const g = c.createLinearGradient(0, -cam.y, 0, floorY - cam.y);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  c.fillStyle = g;
  c.fillRect(-cam.x - 40, -200 - cam.y, WORLD_W + 80, floorY + 400);
}

function paintFloorBand(c, cam, floorY, top, bottom) {
  const g = c.createLinearGradient(0, floorY - cam.y, 0, floorY + 200 - cam.y);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  c.fillStyle = g;
  c.fillRect(-cam.x, floorY - cam.y, WORLD_W, 420);
  c.strokeStyle = 'rgba(255,255,255,0.08)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-cam.x, floorY - cam.y);
  c.lineTo(WORLD_W - cam.x, floorY - cam.y);
  c.stroke();
}

function paintGrid(c, cam, floorY, color, step) {
  c.strokeStyle = color;
  c.lineWidth = 1;
  for (let x = 0; x < WORLD_W; x += step) {
    c.beginPath();
    c.moveTo(x - cam.x, floorY - cam.y);
    c.lineTo(x - cam.x, floorY + 80 - cam.y);
    c.stroke();
  }
}

function mountain(c, x, baseY, w, h, fill, peak) {
  c.fillStyle = fill;
  c.beginPath();
  c.moveTo(x, baseY);
  c.lineTo(x + w * 0.35, baseY - h);
  c.lineTo(x + w * 0.55, baseY - h * 0.7);
  c.lineTo(x + w, baseY);
  c.closePath();
  c.fill();
  if (peak) {
    c.fillStyle = peak;
    c.beginPath();
    c.moveTo(x + w * 0.28, baseY - h * 0.75);
    c.lineTo(x + w * 0.35, baseY - h);
    c.lineTo(x + w * 0.45, baseY - h * 0.72);
    c.closePath();
    c.fill();
  }
}

function cloud(c, x, y, r, color) {
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, r * 0.55, 0, Math.PI * 2);
  c.arc(x + r * 0.5, y - r * 0.15, r * 0.45, 0, Math.PI * 2);
  c.arc(x + r, y, r * 0.5, 0, Math.PI * 2);
  c.arc(x + r * 0.45, y + r * 0.15, r * 0.4, 0, Math.PI * 2);
  c.fill();
}

/** Draw static prop bodies with map-tinted materials. */
export function drawMapProps(c, world, cam, map) {
  const accent = map?.colors?.accent || 'rgba(160,120,60,0.2)';
  for (const b of world.bodies) {
    if (!b.isStatic || b.label !== 'prop') continue;
    if (b.plugin?.mine || b.plugin?.spike) continue;
    const x = b.position.x - cam.x;
    const y = b.position.y - cam.y;
    const w = b.bounds.max.x - b.bounds.min.x;
    const h = b.bounds.max.y - b.bounds.min.y;
    c.save();
    c.translate(x, y);
    c.rotate(b.angle);

    const id = map?.id || 'gulag';
    let g;
    if (id === 'arctic') {
      g = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      g.addColorStop(0, '#e8f6ff');
      g.addColorStop(0.5, '#b8d8ec');
      g.addColorStop(1, '#8ab8d0');
    } else if (id === 'hellscape') {
      g = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      g.addColorStop(0, '#4a2010');
      g.addColorStop(0.5, '#2a1008');
      g.addColorStop(1, '#1a0804');
    } else if (id === 'candy') {
      g = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      g.addColorStop(0, '#ff8ec8');
      g.addColorStop(0.5, '#ffd0ea');
      g.addColorStop(1, '#ff6aa8');
    } else if (id === 'moon') {
      g = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      g.addColorStop(0, '#6a6a78');
      g.addColorStop(0.5, '#4a4a55');
      g.addColorStop(1, '#3a3a44');
    } else if (id === 'jungle') {
      g = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      g.addColorStop(0, '#5a7a38');
      g.addColorStop(0.5, '#3a5020');
      g.addColorStop(1, '#2a3818');
    } else if (id === 'carnival') {
      g = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      g.addColorStop(0, '#c04060');
      g.addColorStop(0.5, '#2a1830');
      g.addColorStop(1, '#f0d8a0');
    } else {
      g = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      g.addColorStop(0, '#5a4a3a');
      g.addColorStop(0.5, '#3a3028');
      g.addColorStop(1, '#2a2018');
    }
    c.fillStyle = g;
    c.strokeStyle = accent;
    c.lineWidth = 1.5;
    const r = Math.min(8, w * 0.15, h * 0.15);
    roundRectPath(c, -w / 2, -h / 2, w, h, r);
    c.fill();
    c.stroke();
    c.restore();
  }
}

function roundRectPath(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
