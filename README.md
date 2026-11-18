# TIDEBLOOM

**Conduct the moon-tide.** Drag with the mouse to paint currents into the
sea, and carry the glow-seeds from the vents into the rings of light
before the moon crosses the sky. Bloom the quota, and the tide is yours;
let the moon set first, and the garden stays drowned.

Twelve tides across three reefs — the Shallows, the Kelp Deep and the
Midnight Reef — with rocks that shatter seeds, whirlpools that swallow
them, and jellyfish that sting them out of the water. After every
cleared tide the sea offers a blessing: widen your brush, strengthen
your currents, lengthen the moonlight, or open twin vents, and carry
the choice through every tide after it. Blooms in quick succession
build a combo worth up to eight times the score.

No libraries, no build step, no network: vanilla JavaScript ES modules
drawing on a 2D canvas, with all sound synthesised live via WebAudio —
a soft pad under the water, a pentatonic pluck for every bloom.

## Controls

| Input | Action |
|---|---|
| Hold left mouse + drag | Paint a current |
| Hold right mouse + drag | Still the water (calm) |
| 1 / 2 / 3 or click a card | Choose a blessing |
| P or Esc | Pause |
| R | Restart after the end |
| Space or click | Begin / play again |

## Layout

- `game/index.html` — the page; everything it loads lives under `game/`.
- `game/src/config.js` — every tuning number, the three reef palettes, the twelve tides.
- `game/src/currents.js` — the paintable flow field.
- `game/src/garden.js` — the world: vents, seeds, bloom pools, hazards, the tide clock, the score.
- `game/src/render.js` — drawing the sea and everything in it.
- `game/src/ui.js` — the HUD and the title, blessing, pause and end screens.
- `game/src/audio.js` — the synthesised sound.
- `game/src/input.js`, `game/src/random.js` — pointer/keyboard input; the seeded random the screenshot scenes rely on.
- `game/src/shots.js` — the deterministic screenshot scenes behind `?shot=title|play|bloom|end`.
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to the output and writes the dossier.
