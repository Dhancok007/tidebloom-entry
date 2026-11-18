// Every tuning number, colour and level definition for TIDEBLOOM in one place. The playfield is
// a fixed 1280x720 logical sea; the renderer scales it to the window, so no rule below depends
// on the screen size. A game is twelve tides across three reefs: paint currents with the
// mouse, carry the glow-seeds into the bloom pools, and fill each tide's quota before the
// moon crosses the sky and the tide goes out.

export const FIELD = { width: 1280, height: 720, floorY: 676 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The flow field the player paints: a grid of water velocities over the whole sea. */
export const FLOW = {
  cell: 20,
  paintStrength: 2600,
  paintRadius: 54,
  maxSpeed: 340,
  decayPerSecond: 0.55,
  ambientMoonPull: 14,
};

/** A glow-seed: drifts with the current, a little buoyant, fragile against the reef. */
export const SEED = {
  radius: 9,
  buoyancy: -12,
  drag: 2.6,
  ownDrift: 10,
  maxAlive: 26,
};

/** A bloom pool: a ring of light on the seabed. A seed that reaches its heart blooms. */
export const BLOOM_POOL = { radius: 46, heartRadius: 17 };

export const ROCK = { minRadius: 16, maxRadius: 34 };
export const WHIRLPOOL = { radius: 52, pull: 150, spin: 2.4 };
export const JELLY = { radius: 20, driftSpeed: 16, bobSeconds: 2.6 };

/** Scoring: a bloom is worth 100 times the live combo; the combo dies after a quiet spell. */
export const SCORE = { bloom: 100, comboWindow: 4, comboMax: 8, tideTimeBonus: 10 };

/** The three blessings offered after every cleared tide; one is picked, and they stack. */
export const BLESSINGS = [
  { id: 'wide-brush', name: 'Wide Brush', text: 'Your painted currents spread 40% wider.' },
  { id: 'strong-tide', name: 'Strong Tide', text: 'Your painted currents run 30% stronger.' },
  { id: 'long-moon', name: 'Long Moonlight', text: 'Every tide from here lasts 15 seconds longer.' },
  { id: 'twin-vents', name: 'Twin Vents', text: 'The vents breathe seeds 30% faster.' },
];

/** One palette per reef: the sea, its light, and what glows in it. */
export const REEFS = [
  {
    name: 'The Shallows',
    deep: '#062a3f', mid: '#0a4a63', glow: '#37e0c8', ray: 'rgba(140,240,220,0.10)',
    seed: '#aef7e2', bloom: '#ffd166', rock: '#0d3549', sand: '#0a2e40',
  },
  {
    name: 'The Kelp Deep',
    deep: '#041e33', mid: '#073b52', glow: '#59c2ff', ray: 'rgba(120,200,255,0.09)',
    seed: '#c8ecff', bloom: '#ff9de2', rock: '#082a3d', sand: '#062336',
  },
  {
    name: 'The Midnight Reef',
    deep: '#030b26', mid: '#0a1e4a', glow: '#b49aff', ray: 'rgba(170,150,255,0.10)',
    seed: '#e6dcff', bloom: '#7dffce', rock: '#0a1433', sand: '#050f29',
  },
];

/**
 * The twelve tides. quota: seeds that must bloom. seconds: until the moon sets. supply: seeds
 * the vents will breathe in all. pools/rocks/whirlpools/jellies: what the reef holds.
 */
export const TIDES = [
  { name: 'First Water', quota: 3, seconds: 75, supply: 8, pools: 1, rocks: 1, whirlpools: 0, jellies: 0 },
  { name: 'Low Lanterns', quota: 4, seconds: 75, supply: 10, pools: 1, rocks: 2, whirlpools: 0, jellies: 1 },
  { name: 'The Long Sand', quota: 5, seconds: 80, supply: 12, pools: 2, rocks: 2, whirlpools: 0, jellies: 1 },
  { name: 'Two Moons', quota: 6, seconds: 85, supply: 14, pools: 2, rocks: 3, whirlpools: 1, jellies: 1 },
  { name: 'Kelp Doors', quota: 6, seconds: 85, supply: 14, pools: 2, rocks: 4, whirlpools: 1, jellies: 2 },
  { name: 'The Sunken Bell', quota: 7, seconds: 90, supply: 16, pools: 2, rocks: 4, whirlpools: 1, jellies: 2 },
  { name: 'Crosscurrents', quota: 8, seconds: 90, supply: 18, pools: 3, rocks: 5, whirlpools: 1, jellies: 2 },
  { name: 'The Glass Reef', quota: 8, seconds: 95, supply: 18, pools: 3, rocks: 6, whirlpools: 2, jellies: 2 },
  { name: 'Night Fishing', quota: 9, seconds: 95, supply: 20, pools: 3, rocks: 6, whirlpools: 2, jellies: 3 },
  { name: 'The Drowned Garden', quota: 10, seconds: 100, supply: 22, pools: 3, rocks: 7, whirlpools: 2, jellies: 3 },
  { name: 'Storm Scripture', quota: 11, seconds: 105, supply: 24, pools: 3, rocks: 8, whirlpools: 3, jellies: 3 },
  { name: 'The Great Bloom', quota: 12, seconds: 120, supply: 26, pools: 4, rocks: 8, whirlpools: 3, jellies: 4 },
];

export const FONT = 'Georgia, "Times New Roman", serif';
export const FONT_UI = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'tidebloom.best';
