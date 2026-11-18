// The garden: TIDEBLOOM's whole simulated world — vents, glow-seeds, bloom pools, rocks,
// whirlpools, jellyfish and the particles they shed — plus the tide clock and the score.
// The world knows nothing about screens or sound; main.js reads the event flags each step
// returns and reacts (a bloom's pluck, a cleared tide's bells). The flow field lives in
// currents.js and is handed in: the world asks it how the water moves where a seed floats.

import { BLOOM_POOL, FIELD, JELLY, ROCK, SCORE, SEED, TIDES, WHIRLPOOL } from './config.js';

export const EVENT_BLOOM = 1;
export const EVENT_LOST = 2;
export const EVENT_CLEARED = 4;
export const EVENT_OVER = 8;

const SPAWN_SECONDS = 2.1;
const MAX_PARTICLES = 420;

export function createGarden(random) {
  const state = {
    tideIndex: 0,
    tide: TIDES[0],
    reefIndex: 0,
    seconds: 0,
    timeLeft: 0,
    score: 0,
    blooms: 0,
    lost: 0,
    streak: 0,
    comboTimer: 0,
    spawned: 0,
    seeds: [],
    pools: [],
    rocks: [],
    whirls: [],
    jellies: [],
    vents: [],
    particles: [],
    spawnTimer: 0,
    finished: false,
  };

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      if (state.particles.length >= MAX_PARTICLES) return;
      const angle = random() * Math.PI * 2;
      const v = (0.3 + random() * 0.7) * speed;
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - 20,
        life: 0, maxLife: 0.7 + random() * 0.8, size: 1.5 + random() * 2.5, color,
      });
    }
  }

  function place(minX, maxX, minY, maxY, placed, minDist) {
    for (let tries = 0; tries < 40; tries += 1) {
      const x = minX + random() * (maxX - minX);
      const y = minY + random() * (maxY - minY);
      let ok = true;
      for (const p of placed) {
        if (Math.hypot(p.x - x, p.y - y) < minDist) { ok = false; break; }
      }
      if (ok) return { x, y };
    }
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }

  return {
    state,

    /**
     * Lay out a tide: vents on the left wall, bloom pools over the right two thirds, hazards
     * between. `mods` carries the blessings earned so far (extraSeconds, spawnScale).
     */
    reset(tideIndex, mods) {
      const tide = TIDES[tideIndex];
      state.tideIndex = tideIndex;
      state.tide = tide;
      state.reefIndex = Math.min(2, Math.floor(tideIndex / 4));
      state.seconds = tide.seconds + (mods.extraSeconds || 0);
      state.timeLeft = state.seconds;
      state.blooms = 0;
      state.lost = 0;
      state.streak = 0;
      state.comboTimer = 0;
      state.spawned = 0;
      state.seeds = [];
      state.particles = [];
      state.spawnTimer = 0.4;
      state.finished = false;

      state.vents = [
        { x: 44, y: 210 + random() * 80 },
        { x: 44, y: 430 + random() * 80 },
      ];
      const placed = [...state.vents];
      state.pools = [];
      for (let i = 0; i < tide.pools; i += 1) {
        const p = place(660, 1160, 190, 590, placed, 190);
        placed.push(p);
        state.pools.push({ x: p.x, y: p.y, flowers: 0, pulse: random() * Math.PI * 2 });
      }
      state.rocks = [];
      for (let i = 0; i < tide.rocks; i += 1) {
        const p = place(240, 1120, 150, 610, placed, 120);
        placed.push(p);
        state.rocks.push({ x: p.x, y: p.y, r: ROCK.minRadius + random() * (ROCK.maxRadius - ROCK.minRadius), seed: random() * 10 });
      }
      state.whirls = [];
      for (let i = 0; i < tide.whirlpools; i += 1) {
        const p = place(330, 1050, 180, 580, placed, 210);
        placed.push(p);
        state.whirls.push({ x: p.x, y: p.y, phase: random() * Math.PI * 2 });
      }
      state.jellies = [];
      for (let i = 0; i < tide.jellies; i += 1) {
        const p = place(300, 1080, 160, 580, placed, 130);
        state.jellies.push({ x: p.x, y: p.y, baseY: p.y, phase: random() * Math.PI * 2, dir: random() < 0.5 ? -1 : 1 });
      }
    },

    /** Advance the world one fixed step; returns the EVENT_* flags of what happened. */
    step(dt, flow, mods) {
      let events = 0;
      if (state.finished) return events;
      state.timeLeft -= dt;
      const moonPhase = 1 - Math.max(0, state.timeLeft) / state.seconds;

      // Vents breathe seeds until the tide's supply is spent.
      state.spawnTimer -= dt;
      const alive = state.seeds.filter((s) => s.alive).length;
      if (state.spawnTimer <= 0 && state.spawned < state.tide.supply && alive < SEED.maxAlive) {
        const vent = state.vents[Math.floor(random() * state.vents.length)];
        state.seeds.push({
          x: vent.x + 14, y: vent.y + (random() - 0.5) * 16,
          vx: 30 + random() * 20, vy: (random() - 0.5) * 14,
          alive: true, age: 0, wobble: random() * Math.PI * 2,
        });
        state.spawned += 1;
        state.spawnTimer = SPAWN_SECONDS / (mods.spawnScale || 1);
        burst(vent.x + 8, vent.y, '#bff3ff', 3, 30);
      }

      if (state.comboTimer > 0) {
        state.comboTimer -= dt;
        if (state.comboTimer <= 0) state.streak = 0;
      }

      for (const jelly of state.jellies) {
        jelly.phase += dt / JELLY.bobSeconds * Math.PI;
        jelly.x += jelly.dir * JELLY.driftSpeed * dt + flow.sample(jelly.x, jelly.y, moonPhase).x * dt * 0.25;
        jelly.y = jelly.baseY + Math.sin(jelly.phase) * 26;
        if (jelly.x < 120) jelly.dir = 1;
        if (jelly.x > FIELD.width - 120) jelly.dir = -1;
      }
      for (const whirl of state.whirls) whirl.phase += dt * WHIRLPOOL.spin;

      for (const seed of state.seeds) {
        if (!seed.alive) continue;
        seed.age += dt;
        const f = flow.sample(seed.x, seed.y, moonPhase);
        const blend = Math.min(1, SEED.drag * dt);
        seed.vx += (f.x - seed.vx) * blend;
        seed.vy += (f.y - seed.vy) * blend + SEED.buoyancy * dt;
        seed.vx += Math.cos(seed.age * 1.7 + seed.wobble) * SEED.ownDrift * dt;
        // A whirlpool takes hold inside its radius: tangential spin plus a pull to the heart.
        for (const whirl of state.whirls) {
          const dx = whirl.x - seed.x;
          const dy = whirl.y - seed.y;
          const d = Math.hypot(dx, dy);
          if (d < WHIRLPOOL.radius && d > 1) {
            seed.vx += ((-dy / d) * WHIRLPOOL.spin * 40 + (dx / d) * WHIRLPOOL.pull) * dt;
            seed.vy += (((dx / d) * WHIRLPOOL.spin * 40) + (dy / d) * WHIRLPOOL.pull) * dt;
            if (d < 15) {
              seed.alive = false;
              state.lost += 1;
              state.streak = 0;
              events |= EVENT_LOST;
              burst(seed.x, seed.y, '#9fb7ff', 10, 60);
            }
          }
        }
        if (!seed.alive) continue;
        seed.x += seed.vx * dt;
        seed.y += seed.vy * dt;
        // The sea walls: a seed rests against the surface, the floor and the side walls.
        if (seed.y < 60) { seed.y = 60; seed.vy = Math.abs(seed.vy) * 0.4; }
        if (seed.y > FIELD.floorY - 8) { seed.y = FIELD.floorY - 8; seed.vy = -Math.abs(seed.vy) * 0.3; }
        if (seed.x < 14) { seed.x = 14; seed.vx = Math.abs(seed.vx) * 0.4; }
        if (seed.x > FIELD.width - 14) { seed.x = FIELD.width - 14; seed.vx = -Math.abs(seed.vx) * 0.4; }

        for (const rock of state.rocks) {
          if (Math.hypot(rock.x - seed.x, rock.y - seed.y) < rock.r + SEED.radius - 3) {
            seed.alive = false;
            state.lost += 1;
            state.streak = 0;
            events |= EVENT_LOST;
            burst(seed.x, seed.y, '#ffb3a0', 10, 70);
            break;
          }
        }
        if (!seed.alive) continue;
        for (const jelly of state.jellies) {
          if (Math.hypot(jelly.x - seed.x, jelly.y - seed.y) < JELLY.radius + SEED.radius - 2) {
            seed.alive = false;
            state.lost += 1;
            state.streak = 0;
            events |= EVENT_LOST;
            burst(seed.x, seed.y, '#ffc7ec', 10, 70);
            break;
          }
        }
        if (!seed.alive) continue;
        for (const pool of state.pools) {
          if (Math.hypot(pool.x - seed.x, pool.y - seed.y) < BLOOM_POOL.heartRadius + SEED.radius) {
            seed.alive = false;
            pool.flowers += 1;
            state.blooms += 1;
            state.streak = Math.min(SCORE.comboMax, state.streak + 1);
            state.comboTimer = SCORE.comboWindow;
            state.score += SCORE.bloom * Math.max(1, state.streak);
            events |= EVENT_BLOOM;
            burst(pool.x, pool.y, '#ffe9a8', 16, 90);
            break;
          }
        }
      }

      for (const p of state.particles) {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy -= 14 * dt;
      }
      state.particles = state.particles.filter((p) => p.life < p.maxLife);

      if (state.blooms >= state.tide.quota) {
        state.score += Math.ceil(Math.max(0, state.timeLeft)) * SCORE.tideTimeBonus;
        state.finished = true;
        events |= EVENT_CLEARED;
      } else if (state.timeLeft <= 0 || (state.spawned >= state.tide.supply && !state.seeds.some((s) => s.alive))) {
        state.finished = true;
        events |= EVENT_OVER;
      }
      return events;
    },
  };
}
