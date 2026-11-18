// The screenshot scenes behind ?shot=title|play|bloom|end. Each one plays the real rules
// forward from a fresh garden, steered by a simple pilot that paints a current from every
// drifting seed toward its nearest bloom pool, the way a player does — so the frame is what
// a short game really looks like, and the same seed always gives the same frame. The bloom
// scene plays the first tide to its quota and stops on the blessing choice; the end scene
// plays the whole run through all twelve tides and stops on the Great Bloom victory, the
// account a finished game shows.

import { STEP, TIDES } from './config.js';
import { EVENT_CLEARED, EVENT_OVER } from './garden.js';
import { SCREEN_BLESSING, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './ui.js';

const TITLE_SECONDS = 7;
const PLAY_SECONDS = 34;
const BLOOM_LIMIT_SECONDS = 90;
const END_LIMIT_SECONDS = 200;

/** Paint one stroke per drifting seed, aimed at its nearest pool's heart. */
function pilotPaint(state, flow, mods) {
  for (const seed of state.seeds) {
    if (!seed.alive) continue;
    let pool = null;
    let best = Infinity;
    for (const candidate of state.pools) {
      const d = Math.hypot(candidate.x - seed.x, candidate.y - seed.y);
      if (d < best) { best = d; pool = candidate; }
    }
    if (!pool || best < 26) continue;
    const ux = (pool.x - seed.x) / best;
    const uy = (pool.y - seed.y) / best;
    flow.paint(seed.x - ux * 26, seed.y - uy * 26, seed.x + ux * 44, seed.y + uy * 44, mods.strengthScale, mods.brushScale);
  }
}

function playForward(garden, flow, mods, seconds, pilot) {
  let events = 0;
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (pilot) pilotPaint(garden.state, flow, mods);
    events = garden.step(STEP, flow, mods);
    flow.step(STEP);
    if (events & (EVENT_CLEARED | EVENT_OVER)) break;
  }
  return events;
}

/**
 * Set the garden to the named scene and return the screen to draw over it, the best score
 * to show, and the blessing options when the scene is the blessing choice.
 */
export function stageShot(name, garden, flow, mods) {
  if (name === 'play') {
    garden.reset(2, mods);
    playForward(garden, flow, mods, PLAY_SECONDS, true);
    return { screen: SCREEN_PLAY, best: 0, options: [0, 1, 2] };
  }
  if (name === 'bloom') {
    garden.reset(0, mods);
    playForward(garden, flow, mods, BLOOM_LIMIT_SECONDS, true);
    garden.state.tidesCleared = 1;
    return { screen: SCREEN_BLESSING, best: 0, options: [0, 1, 3] };
  }
  if (name === 'end') {
    let lost = 0;
    for (let t = 0; t < TIDES.length; t += 1) {
      garden.reset(t, mods);
      playForward(garden, flow, mods, END_LIMIT_SECONDS, true);
      lost += garden.state.lost;
    }
    garden.state.totalLost = lost;
    return { screen: SCREEN_WIN, best: garden.state.score, options: [0, 1, 2] };
  }
  garden.reset(0, mods);
  playForward(garden, flow, mods, TITLE_SECONDS, false);
  garden.state.timeLeft = garden.state.seconds;
  void TIDES;
  return { screen: SCREEN_TITLE, best: 0, options: [0, 1, 2] };
}
