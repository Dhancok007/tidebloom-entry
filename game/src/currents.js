// The flow field: a grid of water velocities covering the sea, and everything that moves the
// water. The player paints strokes into it; strokes fade over a few seconds, so a current is
// a thing you keep renewing, not a wall you build once. Under it all the moon pulls a slow
// ambient drift toward the bloom side of the reef, so no seed ever sits perfectly still.

import { FIELD, FLOW } from './config.js';

const COLS = Math.ceil(FIELD.width / FLOW.cell);
const ROWS = Math.ceil(FIELD.height / FLOW.cell);

export function createFlow() {
  const vx = new Float32Array(COLS * ROWS);
  const vy = new Float32Array(COLS * ROWS);

  function cellAt(x, y) {
    const cx = Math.min(COLS - 1, Math.max(0, Math.floor(x / FLOW.cell)));
    const cy = Math.min(ROWS - 1, Math.max(0, Math.floor(y / FLOW.cell)));
    return cy * COLS + cx;
  }

  return {
    cols: COLS,
    rows: ROWS,

    /** Add a painted stroke: water along the segment from (x0,y0) to (x1,y1) takes its motion. */
    paint(x0, y0, x1, y1, strengthScale, radiusScale) {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const dist = Math.hypot(dx, dy);
      if (dist < 1) return;
      const radius = FLOW.paintRadius * radiusScale;
      const steps = Math.max(1, Math.ceil(dist / (FLOW.cell / 2)));
      for (let s = 0; s <= steps; s += 1) {
        const cx = x0 + (dx * s) / steps;
        const cy = y0 + (dy * s) / steps;
        const reach = Math.ceil(radius / FLOW.cell);
        const gx = Math.floor(cx / FLOW.cell);
        const gy = Math.floor(cy / FLOW.cell);
        for (let oy = -reach; oy <= reach; oy += 1) {
          for (let ox = -reach; ox <= reach; ox += 1) {
            const px = gx + ox;
            const py = gy + oy;
            if (px < 0 || py < 0 || px >= COLS || py >= ROWS) continue;
            const ddx = (px + 0.5) * FLOW.cell - cx;
            const ddy = (py + 0.5) * FLOW.cell - cy;
            const fall = 1 - Math.min(1, Math.hypot(ddx, ddy) / radius);
            if (fall <= 0) continue;
            const i = py * COLS + px;
            vx[i] += (dx / dist) * FLOW.paintStrength * strengthScale * fall * 0.016;
            vy[i] += (dy / dist) * FLOW.paintStrength * strengthScale * fall * 0.016;
          }
        }
      }
      this.clamp();
    },

    /** Still the water in a disc: the right-drag calm, for undoing a stroke gone wrong. */
    calm(x, y, radiusScale) {
      const radius = FLOW.paintRadius * 1.2 * radiusScale;
      const reach = Math.ceil(radius / FLOW.cell);
      const gx = Math.floor(x / FLOW.cell);
      const gy = Math.floor(y / FLOW.cell);
      for (let oy = -reach; oy <= reach; oy += 1) {
        for (let ox = -reach; ox <= reach; ox += 1) {
          const px = gx + ox;
          const py = gy + oy;
          if (px < 0 || py < 0 || px >= COLS || py >= ROWS) continue;
          const d = Math.hypot((px + 0.5) * FLOW.cell - x, (py + 0.5) * FLOW.cell - y);
          if (d > radius) continue;
          const i = py * COLS + px;
          vx[i] *= 0.6;
          vy[i] *= 0.6;
        }
      }
    },

    /** Keep every cell at or under the water's top speed, so strokes stack but never explode. */
    clamp() {
      for (let i = 0; i < vx.length; i += 1) {
        const speed = Math.hypot(vx[i], vy[i]);
        if (speed > FLOW.maxSpeed) {
          vx[i] = (vx[i] / speed) * FLOW.maxSpeed;
          vy[i] = (vy[i] / speed) * FLOW.maxSpeed;
        }
      }
    },

    /** The water's velocity at a point: the cell's flow plus the moon's slow ambient pull. */
    sample(x, y, moonPhase) {
      const i = cellAt(x, y);
      return {
        x: vx[i] + FLOW.ambientMoonPull * Math.cos(moonPhase * Math.PI * 2),
        y: vy[i] + 4 * Math.sin(moonPhase * Math.PI * 4 + x * 0.002),
      };
    },

    /** Raw cell velocity, for the renderer's current streaks. */
    cellVelocity(cx, cy) {
      const i = cy * COLS + cx;
      return { x: vx[i], y: vy[i] };
    },

    /** Fade the painted water back toward stillness; called once per fixed step. */
    step(dt) {
      const fade = Math.max(0, 1 - FLOW.decayPerSecond * dt);
      for (let i = 0; i < vx.length; i += 1) {
        vx[i] *= fade;
        vy[i] *= fade;
      }
    },

    clear() {
      vx.fill(0);
      vy.fill(0);
    },
  };
}
