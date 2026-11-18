// Boot and the one loop for TIDEBLOOM: input is read every frame, the sea advances in fixed
// 1/60 s steps, and the renderer and the UI paint what is there. The game moves between six
// screens: title, play, the blessing choice after a cleared tide, paused, the moon-set end,
// and the Great Bloom win. Blessings the player picks are kept as `mods` and handed to the
// garden and the flow field on every step, so their effect is part of the rules, not a flag
// the world has to know about.
//
// ?seed=N fixes the reef layout. ?shot=title|play|bloom|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, FLOW, STEP, TIDES } from './config.js';
import { createRandom } from './random.js';
import { createGarden, EVENT_BLOOM, EVENT_CLEARED, EVENT_LOST, EVENT_OVER } from './garden.js';
import { createFlow } from './currents.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_PICK_1, ACTION_PICK_2, ACTION_PICK_3, ACTION_RESTART, createInput } from './input.js';
import { createRenderer } from './render.js';
import { blessingCardRects, createUi, SCREEN_BLESSING, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './ui.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const random = createRandom(seed);
const garden = createGarden(random);
const flow = createFlow();
const renderer = createRenderer(canvas);
const ui = createUi();
const audio = createAudio();

/** The blessings' running effect: brush width, current strength, longer moons, faster vents. */
function freshMods() {
  return { brushScale: 1, strengthScale: 1, extraSeconds: 0, spawnScale: 1 };
}

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function drawFrame(screen, best, options, pointer, mods, time) {
  const ctx = renderer.drawWorld(garden.state, flow, time, screen === SCREEN_PLAY ? pointer : null, FLOW.paintRadius * (mods ? mods.brushScale : 1));
  const state = garden.state;
  if (screen === SCREEN_TITLE) ui.drawTitle(ctx, state, best);
  else if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
    ui.drawHud(ctx, state);
    if (screen === SCREEN_PAUSED) ui.drawPaused(ctx);
  } else if (screen === SCREEN_BLESSING) {
    ui.drawHud(ctx, state);
    ui.drawBlessing(ctx, state, options, state.score);
  } else if (screen === SCREEN_OVER) ui.drawEnd(ctx, state, best, false, state.tidesCleared || 0);
  else if (screen === SCREEN_WIN) ui.drawEnd(ctx, state, best, true, TIDES.length);
}

function runShot(name) {
  const mods = freshMods();
  const scene = stageShot(name, garden, flow, mods);
  let painted = 0;
  function paint() {
    drawFrame(scene.screen, scene.best, scene.options, null, mods, 8);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, renderer.toLogical);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let mods = freshMods();
  let options = [0, 1, 2];
  let accumulator = 0;
  let last = performance.now();
  let time = 0;

  garden.state.totalLost = 0;
  garden.state.tidesCleared = 0;
  garden.reset(0, mods);

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    mods = freshMods();
    garden.state.score = 0;
    garden.state.totalLost = 0;
    garden.state.tidesCleared = 0;
    flow.clear();
    garden.reset(0, mods);
    screen = SCREEN_PLAY;
    announce('Tide 1. Paint currents and carry the seeds to the light.');
  }

  function finishRun(won) {
    garden.state.totalLost += garden.state.lost;
    if (garden.state.score > best) {
      best = garden.state.score;
      saveBest(best);
    }
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (won) audio.cleared();
    else audio.over();
    announce(won ? `The Great Bloom. Score ${garden.state.score}.` : `The moon set first. Score ${garden.state.score}. Best ${best}.`);
  }

  function tideCleared() {
    garden.state.totalLost += garden.state.lost;
    garden.state.tidesCleared += 1;
    audio.cleared();
    if (garden.state.tideIndex >= TIDES.length - 1) {
      finishRun(true);
      return;
    }
    // Three distinct blessings of the four, drawn fresh each tide.
    const pool = [0, 1, 2, 3];
    options = [];
    while (options.length < 3) options.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
    screen = SCREEN_BLESSING;
    announce(`Tide ${garden.state.tideIndex + 1} bloomed. Choose a blessing: 1, 2 or 3.`);
  }

  function applyBlessing(index) {
    const id = ['wide-brush', 'strong-tide', 'long-moon', 'twin-vents'][options[index]];
    if (id === 'wide-brush') mods.brushScale *= 1.4;
    else if (id === 'strong-tide') mods.strengthScale *= 1.3;
    else if (id === 'long-moon') mods.extraSeconds += 15;
    else if (id === 'twin-vents') mods.spawnScale *= 1.3;
    flow.clear();
    garden.reset(garden.state.tideIndex + 1, mods);
    screen = SCREEN_PLAY;
    announce(`Tide ${garden.state.tideIndex + 1}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions) audio.unlock();
    if (screen === SCREEN_TITLE && (actions & ACTION_CONFIRM)) startGame();
    else if ((screen === SCREEN_OVER || screen === SCREEN_WIN) && (actions & (ACTION_CONFIRM | ACTION_RESTART))) startGame();
    else if (screen === SCREEN_PLAY && (actions & ACTION_PAUSE)) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (screen === SCREEN_PAUSED && (actions & (ACTION_PAUSE | ACTION_CONFIRM))) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    } else if (screen === SCREEN_BLESSING) {
      let pick = -1;
      if (actions & ACTION_PICK_1) pick = 0;
      else if (actions & ACTION_PICK_2) pick = 1;
      else if (actions & ACTION_PICK_3) pick = 2;
      else if (actions & ACTION_CONFIRM) {
        const pointer = input.pointer();
        const rects = blessingCardRects();
        for (let i = 0; i < rects.length; i += 1) {
          const r = rects[i];
          if (pointer.x >= r.x && pointer.x <= r.x + r.width && pointer.y >= r.y && pointer.y <= r.y + r.height) pick = i;
        }
      }
      if (pick >= 0) applyBlessing(pick);
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // The sea idles behind the title: seeds drift on the moon's pull alone, and the tide
      // clock is held at the top so the scene never ends under the words.
      garden.step(STEP, flow, mods);
      garden.state.timeLeft = garden.state.seconds;
      if (garden.state.finished) garden.reset(0, mods);
      flow.step(STEP);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const stroke = input.stroke();
    if (stroke) {
      if (stroke.calm) flow.calm(stroke.x1, stroke.y1, mods.brushScale);
      else flow.paint(stroke.x0, stroke.y0, stroke.x1, stroke.y1, mods.strengthScale, mods.brushScale);
    }
    const events = garden.step(STEP, flow, mods);
    flow.step(STEP);
    if (events & EVENT_BLOOM) audio.bloom(garden.state.streak);
    if (events & EVENT_LOST) audio.lost();
    if (events & EVENT_CLEARED) tideCleared();
    else if (events & EVENT_OVER) finishRun(false);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min((now - last) / 1000, MAX_FRAME);
    accumulator += elapsed;
    last = now;
    time += elapsed;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    drawFrame(screen, best, options, input.pointer(), mods, time);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('TIDEBLOOM. Click or press Space to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
