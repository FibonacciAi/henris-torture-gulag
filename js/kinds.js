/**
 * Inmate / creature kinds for Henri's Torture Gulag.
 * Built for maximum 9–11-year-old chaos energy.
 */

/**
 * @typedef {object} PersonKind
 * @property {string} id
 * @property {string} name
 * @property {string} emoji
 * @property {string} blurb
 * @property {number} weight          spawn weight
 * @property {number} scaleMin
 * @property {number} scaleMax
 * @property {number} [hpMul]
 * @property {number} [densityMul]
 * @property {number} [restitution]   bounciness
 * @property {number} [frictionAir]
 * @property {string[]} skin
 * @property {string[]} shirt
 * @property {string[]} pants
 * @property {string} [blood]         blood / fluid color
 * @property {string} [tint]          full-body multiply tint
 * @property {number} [tintAlpha]
 * @property {boolean} [noBlood]
 * @property {boolean} [floaty]       soft upward drift while alive
 * @property {boolean} [heavy]
 * @property {string} [accessory]     head/torso doodad key
 * @property {string} [labelColor]
 */

/** @type {PersonKind[]} */
export const PERSON_KINDS = [
  {
    id: 'inmate',
    name: 'INMATE',
    emoji: '😐',
    blurb: 'Standard issue. Soft. Screamable.',
    weight: 14,
    scaleMin: 0.92,
    scaleMax: 1.08,
    hpMul: 1,
    densityMul: 1,
    skin: ['#c9a88a', '#b8956e', '#d4b090', '#a67c52', '#c4a07a'],
    shirt: ['#6a6a6a', '#5c5854', '#4a5248', '#7a7268', '#555a50'],
    pants: ['#3a3a3a', '#2e2e2e', '#444038'],
    blood: '#8a1020',
    accessory: null,
  },
  {
    id: 'goblin',
    name: 'GOBLIN',
    emoji: '👺',
    blurb: 'Tiny green menace. Hard to grab.',
    weight: 10,
    scaleMin: 0.55,
    scaleMax: 0.68,
    hpMul: 0.7,
    densityMul: 0.75,
    restitution: 0.12,
    frictionAir: 0.028,
    skin: ['#5a9a3a', '#4a8a2a', '#6aaa40', '#3d7a28'],
    shirt: ['#3a5020', '#2a4018', '#4a6030'],
    pants: ['#2a3018', '#1a2010'],
    blood: '#3a8020',
    tint: '#4a8a30',
    tintAlpha: 0.35,
    accessory: 'horns',
    labelColor: '#7dff4a',
  },
  {
    id: 'bruiser',
    name: 'BRUISER',
    emoji: '💪',
    blurb: 'Big. Heavy. Takes a beating.',
    weight: 8,
    scaleMin: 1.28,
    scaleMax: 1.45,
    hpMul: 1.85,
    densityMul: 1.55,
    frictionAir: 0.04,
    heavy: true,
    skin: ['#b88868', '#a87858', '#c89878'],
    shirt: ['#4a2020', '#5a1818', '#3a1010'],
    pants: ['#1a1a22', '#121218'],
    blood: '#8a1020',
    tint: '#8a4030',
    tintAlpha: 0.18,
    accessory: 'brow',
    labelColor: '#ff8866',
  },
  {
    id: 'skeleton',
    name: 'SKELETON',
    emoji: '💀',
    blurb: 'Rattle rattle. Squish-proof-ish.',
    weight: 8,
    scaleMin: 0.88,
    scaleMax: 1.02,
    hpMul: 0.55,
    densityMul: 0.55,
    restitution: 0.15,
    frictionAir: 0.025,
    skin: ['#e8e0d0', '#f0e8d8', '#d8d0c0'],
    shirt: ['#c8c0b0', '#b8b0a0'],
    pants: ['#a8a090', '#989080'],
    blood: '#d0c8b0',
    noBlood: false,
    tint: '#e8e0d0',
    tintAlpha: 0.45,
    accessory: 'skull',
    labelColor: '#f0e8d0',
  },
  {
    id: 'robot',
    name: 'ROBOT',
    emoji: '🤖',
    blurb: 'Beep boop. Sparks not blood.',
    weight: 8,
    scaleMin: 0.95,
    scaleMax: 1.12,
    hpMul: 1.5,
    densityMul: 1.35,
    restitution: 0.05,
    skin: ['#8a9aaa', '#6a7a8a', '#9aaaba'],
    shirt: ['#4a5560', '#3a4550', '#5a6570'],
    pants: ['#2a3038', '#1a2028'],
    blood: '#44ccff',
    noBlood: true,
    tint: '#6a8090',
    tintAlpha: 0.4,
    accessory: 'antenna',
    labelColor: '#66ddff',
  },
  {
    id: 'alien',
    name: 'ALIEN',
    emoji: '👽',
    blurb: 'Big head. Floaty. From somewhere worse.',
    weight: 8,
    scaleMin: 0.85,
    scaleMax: 1.05,
    hpMul: 0.9,
    densityMul: 0.65,
    frictionAir: 0.055,
    floaty: true,
    skin: ['#70e070', '#50c850', '#90f090', '#40b060'],
    shirt: ['#304850', '#203840', '#405860'],
    pants: ['#203038', '#182830'],
    blood: '#50ff80',
    tint: '#40c060',
    tintAlpha: 0.4,
    accessory: 'bighead',
    labelColor: '#80ff90',
  },
  {
    id: 'ninja',
    name: 'NINJA',
    emoji: '🥷',
    blurb: 'Sneaky. Light. Looks cool mid-yeet.',
    weight: 7,
    scaleMin: 0.88,
    scaleMax: 1.0,
    hpMul: 0.85,
    densityMul: 0.8,
    frictionAir: 0.022,
    skin: ['#c9a88a', '#b8956e'],
    shirt: ['#1a1a1a', '#0a0a0a', '#2a2a2a'],
    pants: ['#101010', '#181818'],
    blood: '#8a1020',
    tint: '#1a1a1a',
    tintAlpha: 0.35,
    accessory: 'mask',
    labelColor: '#cccccc',
  },
  {
    id: 'clown',
    name: 'CLOWN',
    emoji: '🤡',
    blurb: 'Honk. Bounce. Nightmares optional.',
    weight: 8,
    scaleMin: 0.9,
    scaleMax: 1.1,
    hpMul: 1.05,
    densityMul: 0.85,
    restitution: 0.45,
    frictionAir: 0.03,
    skin: ['#ffe0d0', '#ffd0c0'],
    shirt: ['#ff2244', '#2244ff', '#ffdd22', '#ff44aa'],
    pants: ['#222266', '#662222', '#226622'],
    blood: '#ff44aa',
    accessory: 'clown',
    labelColor: '#ff66aa',
  },
  {
    id: 'zombie',
    name: 'ZOMBIE',
    emoji: '🧟',
    blurb: 'Slow. Stinky. Surprisingly durable.',
    weight: 8,
    scaleMin: 0.95,
    scaleMax: 1.15,
    hpMul: 1.4,
    densityMul: 1.1,
    frictionAir: 0.045,
    skin: ['#7a9a6a', '#6a8a5a', '#8aaa7a', '#5a7a4a'],
    shirt: ['#4a5040', '#3a4030', '#5a6050'],
    pants: ['#2a3020', '#1a2010'],
    blood: '#4a6020',
    tint: '#5a7a40',
    tintAlpha: 0.3,
    accessory: 'scar',
    labelColor: '#90c060',
  },
  {
    id: 'rubber',
    name: 'RUBBER DUDE',
    emoji: '🟡',
    blurb: 'Super bouncy. Physics says no. He says yes.',
    weight: 7,
    scaleMin: 0.9,
    scaleMax: 1.1,
    hpMul: 1.2,
    densityMul: 0.7,
    restitution: 0.85,
    frictionAir: 0.02,
    skin: ['#ffe040', '#ffd020', '#ffc000'],
    shirt: ['#ffaa00', '#ff8800'],
    pants: ['#cc8800', '#aa6600'],
    blood: '#ffcc00',
    tint: '#ffdd20',
    tintAlpha: 0.35,
    accessory: 'smile',
    labelColor: '#ffee44',
  },
  {
    id: 'balloon',
    name: 'BALLOON KID',
    emoji: '🎈',
    blurb: 'Almost floats away. Pop science.',
    weight: 6,
    scaleMin: 0.75,
    scaleMax: 0.95,
    hpMul: 0.45,
    densityMul: 0.28,
    restitution: 0.55,
    frictionAir: 0.08,
    floaty: true,
    skin: ['#ff90b0', '#ff70a0', '#ffb0d0', '#90d0ff', '#b090ff'],
    shirt: ['#ff5080', '#50a0ff', '#d050ff'],
    pants: ['#e04070', '#4080e0'],
    blood: '#ff80c0',
    tint: '#ff90b8',
    tintAlpha: 0.25,
    accessory: 'balloon',
    labelColor: '#ff90c0',
  },
  {
    id: 'wizard',
    name: 'WIZARD',
    emoji: '🧙',
    blurb: 'Pointy hat. Questionable magic.',
    weight: 6,
    scaleMin: 0.9,
    scaleMax: 1.08,
    hpMul: 0.95,
    densityMul: 0.9,
    skin: ['#c9a88a', '#d4b090', '#b8956e'],
    shirt: ['#4a2080', '#3a1070', '#5a30a0', '#2a0848'],
    pants: ['#2a1840', '#1a0830'],
    blood: '#8a40ff',
    tint: '#4a2080',
    tintAlpha: 0.2,
    accessory: 'hat',
    labelColor: '#c080ff',
  },
  {
    id: 'knight',
    name: 'KNIGHT',
    emoji: '🛡️',
    blurb: 'Clank clank. Armor plating vibes.',
    weight: 7,
    scaleMin: 1.05,
    scaleMax: 1.22,
    hpMul: 1.7,
    densityMul: 1.45,
    heavy: true,
    skin: ['#c9a88a', '#b8956e'],
    shirt: ['#8a9098', '#6a7078', '#a0a8b0'],
    pants: ['#5a6068', '#4a5058'],
    blood: '#8a1020',
    tint: '#808890',
    tintAlpha: 0.4,
    accessory: 'helmet',
    labelColor: '#c0c8d0',
  },
  {
    id: 'chicken',
    name: 'CHICKEN GUY',
    emoji: '🐔',
    blurb: 'Why is he a chicken. Do not ask.',
    weight: 7,
    scaleMin: 0.7,
    scaleMax: 0.9,
    hpMul: 0.75,
    densityMul: 0.7,
    restitution: 0.25,
    skin: ['#ffe8a0', '#ffd880', '#fff0c0'],
    shirt: ['#ff4040', '#e03030'],
    pants: ['#ff9040', '#e07020'],
    blood: '#ff6060',
    tint: '#ffe080',
    tintAlpha: 0.3,
    accessory: 'beak',
    labelColor: '#ffcc44',
  },
  {
    id: 'super',
    name: 'SUPER DUDE',
    emoji: '🦸',
    blurb: 'Cape physics pending. Ego intact.',
    weight: 6,
    scaleMin: 1.0,
    scaleMax: 1.18,
    hpMul: 1.6,
    densityMul: 1.05,
    skin: ['#c9a88a', '#d4b090'],
    shirt: ['#2040ff', '#e02020', '#20a040'],
    pants: ['#101840', '#401010', '#104020'],
    blood: '#8a1020',
    accessory: 'cape',
    labelColor: '#6688ff',
  },
];

const byId = new Map(PERSON_KINDS.map((k) => [k.id, k]));

export function getKind(id) {
  return byId.get(id) || PERSON_KINDS[0];
}

export function pickKind(preferredId) {
  if (preferredId && byId.has(preferredId)) return byId.get(preferredId);
  let total = 0;
  for (const k of PERSON_KINDS) total += k.weight;
  let r = Math.random() * total;
  for (const k of PERSON_KINDS) {
    r -= k.weight;
    if (r <= 0) return k;
  }
  return PERSON_KINDS[0];
}

export function pickFrom(arr) {
  return arr[(Math.random() * arr.length) | 0];
}
