// Pointer and keyboard input for TIDEBLOOM. The pointer is the instrument: hold it down and
// drag to paint a current; its position is kept in logical sea coordinates (the renderer
// reports the scale, main.js converts). One-shot presses (confirm, pause, restart, blessing
// picks) are queued as bit flags and taken once by the loop, so a press between two frames is
// never lost and never counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_PICK_1 = 8;
export const ACTION_PICK_2 = 16;
export const ACTION_PICK_3 = 32;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);
const PICKS = new Map([['Digit1', ACTION_PICK_1], ['Digit2', ACTION_PICK_2], ['Digit3', ACTION_PICK_3]]);

export function createInput(canvas, toLogical) {
  let actions = 0;
  let painting = false;
  let calming = false;
  let x = 0;
  let y = 0;
  let px = 0;
  let py = 0;
  let moved = false;

  function track(event) {
    const point = toLogical(event.clientX, event.clientY);
    px = x; py = y;
    x = point.x; y = point.y;
    moved = true;
  }

  canvas.addEventListener('pointerdown', (event) => {
    track(event);
    px = x; py = y;
    if (event.button === 2) calming = true;
    else painting = true;
    actions |= ACTION_CONFIRM;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', track);
  function release(event) {
    if (event.button === 2) calming = false;
    else painting = false;
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', () => { painting = false; calming = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (PICKS.has(event.code)) {
      if (!event.repeat) actions |= PICKS.get(event.code);
    } else return;
    event.preventDefault();
  });
  window.addEventListener('blur', () => { painting = false; calming = false; });

  return {
    /** True while the pointer is held: paint a current from the last point to this one. */
    stroke() {
      if (!painting && !calming) return null;
      const s = { x0: px, y0: py, x1: x, y1: y, calm: calming };
      px = x; py = y;
      return s;
    },
    /** The pointer's logical position, for the brush ring the renderer draws. */
    pointer() {
      return { x, y, painting: painting || calming, moved };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
