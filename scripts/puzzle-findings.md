# Puzzle-game capture controls

## Deliverables and contract

`puzzle-controls.mjs` exports `prepare`, `readState`, `createController`, `startGame`, `captureGame`, four pure planners, and `GAME_INFO`.

Preferred parent API (page already on the correct live URL):

```js
import { prepare } from './scripts/puzzle-controls.mjs';
// Parent installed/paused page.clock, navigated, and awaited document readiness.
const ctl = await prepare(page, 'block'); // block | chromatic | float | serpent
// Float ONLY: consumes its real countdown; does not bypass game rules.
if (ctl.warmupMs) await page.clock.runFor(ctl.warmupMs);
for (let frame = 0; frame < 360; frame++) {
  await ctl.tick(frame); // ONLY observations and real keyboard events
  await page.clock.runFor(frame % 3 === 2 ? 34 : 33);
  // Parent screenshot/FFmpeg here. Canvas selector is ctl.selector.
}
console.log(await ctl.state());
```

`prepare` clicks the real start button with `{force:true,noWaitAfter:true}`, blurs its focus so Space controls gameplay, and returns `{selector, warmupMs, tick, state, controller}`. It does not navigate unless passed `{navigate:true}`. `tick(frame)` uses zero-based monotonically increasing frame numbers at 30fps. No clocks, sleeps, screenshot calls, or direct simulation updates occur inside tick. No dependencies beyond Playwright Page methods. All game-state observations are read-only; all gameplay actions are actual keyboard events. Use normal live URLs, not test mode.

`captureGame(page,key,seconds,options)` is an optional self-contained loop; **do not use it when parent owns frame capture** unless passing `advance: ms => page.clock.runFor(ms)` and `onFrame`. The preferred `prepare` API never advances clocks itself.

No browser was launched by this subagent. Public browser integration and Chromatic pixel decoding still need parent verification. No repository source, browser profile, or external state was changed.

## 4 Block Theory

- Live: `https://nateofspades.github.io/4_Block_Theory_Game/`.
- Start: `#primary` (Start game); restart `#restart`.
- Canvas `#board`: 10 columns × 20 rows, CSS 1:2; dynamically sized, not a fixed 320×640 buffer. CSS desktop width `min(34vh, (100dvh - 200px)/2, 380px)`. Buffer is CSS rect × capped DPR 2. Read exact pixel dimensions from the element after layout; `window.__boardGeometry` gives cell size and offsets.
- Existing public instance: `window.__tetris`. Useful fields `board`, `active:{type,rotation,x,y}`, `nextType`, `held`, `canHold`, `state`, `score`, `lines`, `level`. Methods include cells/collides/ghostY, but the helper does not call mutating methods.
- Keys: Left/Right move, Up clockwise rotation, Down soft drop, Space hard drop, C/Shift hold, P/Escape pause. Real keyboard handler uses `event.code`.
- Supported query: `?seed=1` selects built-in seeded seven-bag RNG; not a board fixture. No seed override is required by helper.
- Planner evaluates all straight-drop placements and one next-piece lookahead, rewarding completed lines and penalizing holes, height, roughness. Rotations/moves/hard drop are spaced at ~67ms so positioning is visible. The hard drop really locks and clears via the game engine.
- Mutability warning: `window.__tetris` is writable as shipped, but **do not stage boards/scores**. Helper reads only.

## Chromatic Cure

- Live: `https://nateofspades.github.io/Chromatic_Cure_Game/`.
- Start `#primary` (Begin study). Canvas `#board` has `tabindex=0`, logical 320×640, grid 8×16, CSS 1:2. Buffer adapts to CSS rect × capped DPR 3. Incoming preview is `#next`, logical 112×56.
- Public app imports `Game` into a private lexical variable; **no live `game` export or public state instance exists**. Importing `src/rules.js` gives classes and rules, not the running instance. `window.capsuleAudio()` is audio-only.
- `window.labTest` exists **only** on `localhost`, `127.0.0.1`, or `[::1]` with `?test=1`. It offers `snapshot()` and `scenario('win'|'topout')`. It will NOT exist on GitHub Pages even with `?test=1`. The capture helper never invokes fixtures or localhost test APIs.
- Public-compatible reader samples actual `#board` RGBA pixels against the renderer's three palette colors (#f4a8ca, #9bdfe5, #e8bd6b). It distinguishes filled capsule facets from hollow anchors, ignores the .18-opacity ghost, reconstructs the settled board, and recognizes newly spawned horizontal facets at row 0, columns 3/4. It reads score and remaining anchors from HUD. State here is **observed** rather than a private engine snapshot. Link identifiers are not recoverable and remain null; planner does not simulate cascade gravity.
- Keys: Left/Right move, Up rotate, Down soft drop, Space hard drop, P pause. Space is ignored on focused buttons, hence focus blur in prepare.
- Planner searches all pair orientations and drop columns, favors immediate four-cell matches/anchor removal and building anchored same-color runs. Controller first soft-drops one row to allow direction 3 (second half above pivot), then rotates/moves/drops via real keys. It waits for the next visible spawn instead of guessing clear/gravity durations.
- Real phase timings: natural fall 750ms at level 1, clear pulse 260ms, linked-cell gravity steps 70ms. No phase or score is overridden. Matching/cascades remain engine-owned.
- Parent verification priority: `const s=await ctl.state()` immediately after prepare should contain 8 anchor cells in `s.board` and an active pair with two colors. If not, inspect actual viewport/DPR pixels; no browser validation was done here. After a few seconds score should increase and anchors fall. No need to fabricate a test scenario if a run is unproductive; capture another normal run or a longer pre-roll using tick + parent clock.

## Float Tweet Bounce

- Live: `https://nateofspades.github.io/Float_Tweet_Bounce_Game/`.
- Start `#start-button`, accessible Start game. Canvas `#game`, logical 360×640, CSS 9:16, buffer CSS rect × capped DPR 3. Shell height `min(100dvh - 16px, (100vw - 16px)*16/9, 840px)` in ordinary desktop layout.
- Public hook `window.__flappy = {game,music,render,handleVisibility,dimensions}`. Reader returns `game.state`, `bird:{x,y,vy,radius,rotation}`, `pipes:[{x,gapY,gap,scored}]`, config, score, elapsed. Helper reads only.
- Space or canvas pointerdown flaps during play; P pauses. Must blur start button before Space.
- Start enters an authentic three-second countdown. `prepare` returns `warmupMs:3000`. Parent should advance that countdown before recording, with no fixture and no direct state mutation. **Do not use `?test=1`**: it disables automatic simulation in RAF! `?fixture=loss` forces loss and must not be used.
- Existing engine physics: gravity 1120, flap velocity -360, bird x92/r14, fixed step 1/120, obstacles width64, spacing214, initial speed112, initial gap164; collision ground y580.
- Controller targets the nearest not-yet-cleared gap center, flapping when falling below center+18; for sharp upward transitions it re-flaps while vy>-250 and below center+65. It uses the normal flap event only, not game.advance or custom physics. Failures throw with pass count instead of silently staging a recovery.

## Serpent Supper

- Live: `https://nateofspades.github.io/Serpent_Supper_Game/`.
- Start `#primary` (Start Game); restart `#restart`.
- Canvas `#game`, actual fixed buffer 720×720, CSS responsive square, grid 24×24 (30 buffer pixels/cell).
- No window game debug global. **The existing ES module exports the real live singleton**: `const {game} = await import(new URL('./app.js',location.href).href)`. This returns the already-loaded module, not a new game. The repository's own `tests/capture-gameplay.js` uses precisely this approach.
- Read fields `snake` (head first), `food`, `direction`, `turns`, `status`, `score`, `size`, `interval`. No state modification needed.
- Keys Arrow/WASD turn; Space pauses. `turns` is a two-entry queue; reversed and duplicate directions are rejected. Controller chooses a BFS path to actual food, avoiding walls/body and immediate reversal; when food is unreachable it favors the largest accessible free area. It sends at most one turn per observed head-cell change and never writes to the queue.
- Initial body length3, score10 per eaten food, interval `max(65,155-score/10*4)` ms; app RAF executes one tick when interval elapsed, resets time (no accumulator).

## Browser-free verification performed

Run `node scripts/puzzle-controls.test.mjs` from project root. The test imports the **original read-only engine source** and exercises pure planners plus actual helper input-queue cadence through a thin fake Page adapter. This is not a substitute game or generated capture; only genuine engine transitions are evaluated. It does not test browser event dispatch or public canvas pixel classification.

Observed passing results:
- Exact helper shape definitions deep-equal the original 4 Block engine definitions.
- Seeds1–12, 24 original-engine piece placements: 6–9 lines cleared, game still playing.
- Seeds1–12, 12s original-engine Float at 30Hz: 5 passed gaps each, alive. Additional seeds1–200: zero failures in the 12s trial after real countdown.
- Seeds1–12, 12s original-engine Serpent interval simulation: 30–90 points, body length6–12, alive.
- Seeds1–12, 18 original-engine capsule placements: all scored matches, score320–970, anchors remaining2–6.
- Actual frame-stepped helper action queues, seed1, 12s: Block score2638/12 cleared lines; Chromatic score840/3 anchors remaining; Float score5/alive; Serpent score40/alive. Chromatic adapter uses exact engine observation for this test, not the pixel decoder.

Issues found/fixed in this subtask: initial Float threshold failed large upward transitions (seeds7/9); added legitimate mid-ascent re-flaps and verified 200 seeds. Browser checks intentionally left to parent per instruction.
