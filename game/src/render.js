// Drawing the sea: everything in the water, and nothing else. The 1280x720 sea is scaled to
// fit the window and centred; the margin takes the reef's deep colour. Light comes from the
// moon's arc at the top: rays lean through the water, the seabed holds dark kelp silhouettes,
// and the bloom pools are rings of light with a flower for every seed they have taken. The
// HUD and the screens live in ui.js; this file paints only the world the player acts on.

import { BLOOM_POOL, FIELD, FLOW, JELLY, REEFS, SEED, WHIRLPOOL } from './config.js';
import { createRandom } from './random.js';

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  // Fixed decoration per reef: kelp stands and pebbles, seeded once so every frame agrees.
  const decorRandom = createRandom(20261115);
  const kelps = [];
  for (let i = 0; i < 26; i += 1) {
    kelps.push({ x: decorRandom() * FIELD.width, h: 40 + decorRandom() * 90, sway: decorRandom() * Math.PI * 2, reef: i % 3 });
  }
  const pebbles = [];
  for (let i = 0; i < 60; i += 1) {
    pebbles.push({ x: decorRandom() * FIELD.width, y: FIELD.floorY + 6 + decorRandom() * 34, r: 2 + decorRandom() * 5 });
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }
  resize();
  window.addEventListener('resize', resize);

  /** Convert a client (CSS pixel) point to logical sea coordinates, for input.js. */
  function toLogical(clientX, clientY) {
    const ratio = window.devicePixelRatio || 1;
    return {
      x: (clientX * ratio - view.x) / view.scale,
      y: (clientY * ratio - view.y) / view.scale,
    };
  }

  function drawSea(state, time) {
    const reef = REEFS[state.reefIndex];
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, reef.mid);
    gradient.addColorStop(0.55, reef.deep);
    gradient.addColorStop(1, reef.deep);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    // Moonlight rays: three broad soft wedges leaning with the moon's place on its arc.
    const moonPhase = 1 - Math.max(0, state.timeLeft) / Math.max(1, state.seconds);
    const moonX = 140 + moonPhase * (FIELD.width - 280);
    context.save();
    context.globalCompositeOperation = 'lighter';
    for (let i = -1; i <= 1; i += 1) {
      context.fillStyle = reef.ray;
      context.beginPath();
      context.moveTo(moonX + i * 130 - 26, 0);
      context.lineTo(moonX + i * 130 + 26, 0);
      context.lineTo(moonX + i * 190 + 120, FIELD.floorY);
      context.lineTo(moonX + i * 190 - 120, FIELD.floorY);
      context.closePath();
      context.fill();
    }
    context.restore();

    // The moon itself, riding its arc above the water line of the HUD.
    context.fillStyle = '#f5efdc';
    context.beginPath();
    context.arc(moonX, 30, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = reef.mid;
    context.beginPath();
    context.arc(moonX + 6, 26, 11, 0, Math.PI * 2);
    context.fill();

    // Seabed and its still life.
    context.fillStyle = reef.sand;
    context.fillRect(0, FIELD.floorY, FIELD.width, FIELD.height - FIELD.floorY);
    context.fillStyle = 'rgba(255,255,255,0.05)';
    for (const p of pebbles) {
      context.beginPath();
      context.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      context.fill();
    }
    context.strokeStyle = reef.glow;
    context.globalAlpha = 0.35;
    context.lineWidth = 3;
    for (const kelp of kelps) {
      if (kelp.reef !== state.reefIndex) continue;
      const sway = Math.sin(time * 0.7 + kelp.sway) * 9;
      context.beginPath();
      context.moveTo(kelp.x, FIELD.floorY + 4);
      context.quadraticCurveTo(kelp.x + sway, FIELD.floorY - kelp.h * 0.6, kelp.x + sway * 1.6, FIELD.floorY - kelp.h);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  function drawVents(state, time) {
    const reef = REEFS[state.reefIndex];
    for (const vent of state.vents) {
      context.fillStyle = reef.rock;
      context.beginPath();
      context.ellipse(vent.x - 8, vent.y, 26, 17, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = reef.glow;
      context.globalAlpha = 0.55 + 0.3 * Math.sin(time * 2.4 + vent.y);
      context.beginPath();
      context.arc(vent.x + 4, vent.y, 6, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
    }
  }

  function drawCurrents(flow, state) {
    const reef = REEFS[state.reefIndex];
    context.strokeStyle = reef.glow;
    context.lineWidth = 2;
    for (let cy = 0; cy < flow.rows; cy += 2) {
      for (let cx = 0; cx < flow.cols; cx += 2) {
        const v = flow.cellVelocity(cx, cy);
        const speed = Math.hypot(v.x, v.y);
        if (speed < 26) continue;
        const x = (cx + 0.5) * FLOW.cell;
        const y = (cy + 0.5) * FLOW.cell;
        context.globalAlpha = Math.min(0.5, speed / 480);
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + (v.x / speed) * 13, y + (v.y / speed) * 13);
        context.stroke();
      }
    }
    context.globalAlpha = 1;
  }

  function drawRocks(state) {
    const reef = REEFS[state.reefIndex];
    for (const rock of state.rocks) {
      context.fillStyle = reef.rock;
      context.beginPath();
      context.ellipse(rock.x, rock.y, rock.r * 1.25, rock.r * 0.85, rock.seed, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = 'rgba(255,255,255,0.10)';
      context.lineWidth = 2;
      context.beginPath();
      context.ellipse(rock.x, rock.y - 3, rock.r * 1.1, rock.r * 0.7, rock.seed, Math.PI * 1.15, Math.PI * 1.75);
      context.stroke();
    }
  }

  function drawWhirlpools(state) {
    for (const whirl of state.whirls) {
      context.strokeStyle = 'rgba(190,215,255,0.5)';
      for (let arm = 0; arm < 3; arm += 1) {
        context.lineWidth = 2.5 - arm * 0.5;
        context.beginPath();
        context.arc(whirl.x, whirl.y, WHIRLPOOL.radius - arm * 13, whirl.phase + arm * 2.1, whirl.phase + arm * 2.1 + 3.6);
        context.stroke();
      }
      context.fillStyle = 'rgba(6,16,34,0.85)';
      context.beginPath();
      context.arc(whirl.x, whirl.y, 11, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawPools(state, time) {
    const reef = REEFS[state.reefIndex];
    for (const pool of state.pools) {
      const pulse = 1 + 0.05 * Math.sin(time * 2 + pool.pulse);
      context.save();
      context.globalCompositeOperation = 'lighter';
      const halo = context.createRadialGradient(pool.x, pool.y, 4, pool.x, pool.y, BLOOM_POOL.radius * 1.5 * pulse);
      halo.addColorStop(0, 'rgba(255,225,150,0.30)');
      halo.addColorStop(1, 'rgba(255,225,150,0)');
      context.fillStyle = halo;
      context.beginPath();
      context.arc(pool.x, pool.y, BLOOM_POOL.radius * 1.5 * pulse, 0, Math.PI * 2);
      context.fill();
      context.restore();
      context.strokeStyle = reef.bloom;
      context.lineWidth = 2.5;
      context.beginPath();
      context.arc(pool.x, pool.y, BLOOM_POOL.radius * pulse, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = 'rgba(255,255,255,0.65)';
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(pool.x, pool.y, BLOOM_POOL.heartRadius + 2, 0, Math.PI * 2);
      context.stroke();
      // A flower for every seed this pool has bloomed, ringing the heart.
      for (let i = 0; i < pool.flowers; i += 1) {
        const angle = (i / Math.max(6, pool.flowers)) * Math.PI * 2 + pool.pulse;
        const fx = pool.x + Math.cos(angle) * (BLOOM_POOL.radius - 13);
        const fy = pool.y + Math.sin(angle) * (BLOOM_POOL.radius - 13);
        context.fillStyle = reef.bloom;
        for (let petal = 0; petal < 5; petal += 1) {
          const pa = (petal / 5) * Math.PI * 2 + angle;
          context.beginPath();
          context.arc(fx + Math.cos(pa) * 4.4, fy + Math.sin(pa) * 4.4, 3.4, 0, Math.PI * 2);
          context.fill();
        }
        context.fillStyle = '#fff6d8';
        context.beginPath();
        context.arc(fx, fy, 2.4, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function drawJellies(state) {
    for (const jelly of state.jellies) {
      context.fillStyle = 'rgba(255,170,225,0.35)';
      context.beginPath();
      context.arc(jelly.x, jelly.y, JELLY.radius, Math.PI, 0);
      context.quadraticCurveTo(jelly.x + JELLY.radius, jelly.y + 8, jelly.x, jelly.y + 6);
      context.quadraticCurveTo(jelly.x - JELLY.radius, jelly.y + 8, jelly.x - JELLY.radius, jelly.y);
      context.fill();
      context.strokeStyle = 'rgba(255,170,225,0.5)';
      context.lineWidth = 1.6;
      for (let t = -1; t <= 1; t += 1) {
        context.beginPath();
        context.moveTo(jelly.x + t * 9, jelly.y + 5);
        context.quadraticCurveTo(jelly.x + t * 11, jelly.y + 18, jelly.x + t * 7, jelly.y + 26 + Math.sin(jelly.phase * 2 + t) * 3);
        context.stroke();
      }
    }
  }

  function drawSeeds(state, time) {
    const reef = REEFS[state.reefIndex];
    for (const seed of state.seeds) {
      if (!seed.alive) continue;
      const glow = 0.75 + 0.25 * Math.sin(time * 3.4 + seed.wobble);
      context.save();
      context.globalCompositeOperation = 'lighter';
      const halo = context.createRadialGradient(seed.x, seed.y, 1, seed.x, seed.y, SEED.radius * 2.6);
      halo.addColorStop(0, 'rgba(190,255,235,0.5)');
      halo.addColorStop(1, 'rgba(190,255,235,0)');
      context.fillStyle = halo;
      context.beginPath();
      context.arc(seed.x, seed.y, SEED.radius * 2.6 * glow, 0, Math.PI * 2);
      context.fill();
      context.restore();
      context.fillStyle = reef.seed;
      context.beginPath();
      context.arc(seed.x, seed.y, SEED.radius, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(seed.x - 2.5, seed.y - 2.5, 3, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      context.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
      context.fillStyle = p.color;
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawBrush(pointer, brushRadius) {
    if (!pointer.moved) return;
    context.strokeStyle = pointer.painting ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)';
    context.lineWidth = 1.6;
    context.beginPath();
    context.arc(pointer.x, pointer.y, brushRadius, 0, Math.PI * 2);
    context.stroke();
  }

  return {
    toLogical,
    /** Paint the world only (sea, currents, hazards, pools, seeds); ui.js adds words on top. */
    drawWorld(state, flow, time, pointer, brushRadius) {
      context.setTransform(1, 0, 0, 1, 0, 0);
      const reef = REEFS[state.reefIndex];
      context.fillStyle = reef.deep;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
      drawSea(state, time);
      drawCurrents(flow, state);
      drawVents(state, time);
      drawRocks(state);
      drawWhirlpools(state);
      drawPools(state, time);
      drawJellies(state);
      drawSeeds(state, time);
      drawParticles(state);
      if (pointer) drawBrush(pointer, brushRadius);
      return context;
    },
    /** The 2D context in logical-sea transform, for ui.js to draw over the same frame. */
    context() {
      return context;
    },
  };
}
