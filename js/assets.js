/** Image loader for Henri's Torture Gulag sprites. */

const cache = new Map();

export function loadImage(src, timeoutMs = 6000) {
  if (cache.has(src)) return cache.get(src);
  const p = new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const finish = (val) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(val);
    };
    const timer = setTimeout(() => {
      console.warn('Asset timeout', src);
      finish(null);
    }, timeoutMs);
    img.onload = () => finish(img);
    img.onerror = () => {
      console.warn('Missing asset', src);
      finish(null);
    };
    // Absolute-ish paths from site root help GH Pages + nested routes
    try {
      img.src = new URL(src, window.location.href).href;
    } catch {
      img.src = src;
    }
  });
  cache.set(src, p);
  return p;
}

export async function loadAll() {
  const paths = {
    labBg: 'assets/bg/lab.jpg',
    logo: 'assets/ui/logo.png',
    keyart: 'assets/ui/keyart.jpg',

    head: 'assets/body/head.png',
    headDead: 'assets/body/head_dead.png',
    torso: 'assets/body/torso.png',
    upperArm: 'assets/body/upper_arm.png',
    lowerArm: 'assets/body/lower_arm.png',
    upperLeg: 'assets/body/upper_leg.png',
    lowerLeg: 'assets/body/lower_leg.png',

    tool_hand: 'assets/tools/hand.png',
    tool_pistol: 'assets/tools/pistol.png',
    tool_shotgun: 'assets/tools/shotgun.png',
    tool_bat: 'assets/tools/bat.png',
    tool_sledge: 'assets/tools/sledge.png',
    tool_chainsaw: 'assets/tools/chainsaw.png',
    tool_rocket: 'assets/tools/rocket.png',
    tool_grenade: 'assets/tools/grenade.png',
    tool_mine: 'assets/tools/mine.png',
    tool_flame: 'assets/tools/flame.png',
    tool_laser: 'assets/tools/laser.png',
    tool_lightning: 'assets/tools/lightning.png',
    tool_anvil: 'assets/tools/anvil.png',
    tool_spikes: 'assets/tools/spikes.png',
    tool_slice: 'assets/tools/slice.png',
    tool_hole: 'assets/tools/hole.png',

    prop_rocket: 'assets/props/rocket.png',
    prop_grenade: 'assets/props/grenade.png',
    prop_mine: 'assets/props/mine.png',
    prop_anvil: 'assets/props/anvil.png',
    prop_spikes: 'assets/props/spikes.png',

    blood0: 'assets/fx/blood_0.png',
    blood1: 'assets/fx/blood_1.png',
    blood2: 'assets/fx/blood_2.png',
  };

  const out = {};
  // Hard ceiling so we never sit on OPENING THE GULAG forever
  const all = Promise.all(
    Object.entries(paths).map(async ([k, src]) => {
      out[k] = await loadImage(src);
    })
  );
  await Promise.race([
    all,
    new Promise((resolve) => setTimeout(resolve, 10000)),
  ]);
  return out;
}

/** Map body part name → asset key */
export const PART_SPRITE = {
  head: 'head',
  torso: 'torso',
  upperArmL: 'upperArm',
  upperArmR: 'upperArm',
  lowerArmL: 'lowerArm',
  lowerArmR: 'lowerArm',
  upperLegL: 'upperLeg',
  upperLegR: 'upperLeg',
  lowerLegL: 'lowerLeg',
  lowerLegR: 'lowerLeg',
};

export const PART_DRAW_SIZE = {
  head: [42, 42],
  torso: [40, 58],
  upperArmL: [20, 38],
  upperArmR: [20, 38],
  lowerArmL: [18, 36],
  lowerArmR: [18, 36],
  upperLegL: [22, 42],
  upperLegR: [22, 42],
  lowerLegL: [20, 40],
  lowerLegR: [20, 40],
};
