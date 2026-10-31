# Eleven targeted video corrections

Status: source revision and authentic captures complete; final export, decoded review and live deployment verification in progress. This document is updated only from real verification output.

## Preserved production baseline

The baseline was downloaded from the actual GitHub Pages player, not selected from old local renders. Starting commit: `771c2a6142fabd6117bd8fdc071badfed404d291`.

- Live source: `media/showcase.mp4?v=4c95e6940e09`.
- SHA-256: `4c95e6940e09f1676de8614a742bf79ded153c889fdece94238d4d684c2950ca`.
- 44,438,446 bytes; 90.000 seconds; 1920×1080; 30 FPS; 2,700 frames.
- H.264 High / level 4.1 / yuv420p, time base 1/15360; AAC LC stereo / 48 kHz, time base 1/48000.
- The baseline decoded completely and played from zero through natural `ended=true` in Chromium with decoded unmuted audio, no media errors and 19 scene/transition captures.
- Recoverable MP4, source/assets/site archive, original README bytes, probe, checksum and baseline browser report: `/root/arcade-targeted-corrections-2026-10-30/`. The October 29 compatible GitHub release is retained separately.
- Neither the preserved original project nor reference MP4/archive is modified.

## Precisely scoped changes

1. **Chromatic Cure:** new genuine take, developed through real keyboard placements. Colored stacks occupy the lower, middle and upper board; only one active native falling pair exists. Same capture dimensions, HUD presentation and nine-second scene.
2. **Rally Reactor collision:** the previous apparent pass-through is a real miss: the ball crosses the native collision plane before the red paddle arrives. The new real-game take contains no points/resets. Its 89-frame source trim places a clean native red-paddle bounce at global 30 seconds; no ball positions or collision logic are edited.
3. **Rally spacing:** move only the top presentation perimeter 12 pixels upward. HUD, court, external title and description remain fixed.
4. **Orb Onslaught:** the actual published blank fields are frames 1039 and 1179, at 34.633333 and 39.300000 seconds. The recording itself contains empty canvas captures, not H.264 decode failures. Adjacent intact frames reconstruct the isolated gaps using bidirectional optical flow. Only those two published gameplay fields are replaced. The entire source take is preserved, with its other unused damaged source frames repaired in the derivative too.
5. **Float HUD:** new capture composites the actual native DOM HUD as a transparent layer over each native canvas frame. No glyphs, counters, positions, typefaces or colors are recreated. Genuine score updates refresh the layer.
6. **Float movement:** recording scheduler invokes the unmodified game's native RAF callbacks at exact 60 Hz, two per output frame. This removes Playwright's 16 ms RAF cadence producing periodic 48 ms jumps at 30 FPS. No engine state, velocities or physics are altered. All 360 source frames are distinct; observed game elapsed increments are uniformly 1/30 second. Positive frame-to-frame acceleration is consistently 1.244444 logical pixels, matching native gravity. Flaps retain genuine velocity changes.
7. **Serpent border:** the canvas/HUD crop omitted the parent board's bottom CSS border. Add only that bottom line inside the video presentation: original `#2b392e`, native one-pixel thickness scaled to 1.51 output pixels, aligned with the existing sides. Snake, board and HUD remain from the published take.
8. **BrikaVolt input:** new real-game take with delayed, variable-duration native pointer movements, fast interceptions, small adjustments and pauses. No paddle/ball state or rules are changed. The first nine seconds retain three lives and native score progression 300–1700. Observed paddle speeds include pauses, small 1–100 px/s adjustments and rapid >500 px/s travel; movement is not a constant-speed sweep.
9. **Brika spacing:** move only the top presentation perimeter 10 pixels upward. HUD and board stay fixed.
10. **Aim spacing:** move only the left presentation perimeter 12 pixels outward. SCORE, all three original gameplay takes, pointer/action, and external copy stay fixed.
11. **Closing URL:** replace only the displayed URL with `https://github.com/nateofspades/Hyperframes_Arcade_Games_Showcase`. No trailing slash; original 36px styling and animation are retained unless native snapshot verification shows clipping. All grid images, game names, headline, CTA and timing are unchanged.

## Source and selective export

The authored compositions remain the editable source of truth. New footage is under `assets/footage/targeted-2026-10-30/`; old footage and all opening/closing stills remain intact. The revision manifest adds five deliberate checksummed derivatives and retains all existing entries.

`capture-targeted.mjs` records public games with real input events, read-only observation and their native engines/renderers. Its RAF clock changes recording synchronization only. `tests/test_targeted_scope.py` compares complete compositions against an explicit local-edit allowlist and preserves every external title, description, canonical style/motion block, master timing, opening, transition and closing-grid byte. It also rejects webpage changes other than a video cache identifier.

To avoid broadly re-rendering approved gameplay, `compose-targeted-video.py` uses the backed-up live master and the explicit rectangles in `targeted-render.json`. New footage replaces only the designated gameplay interiors, with the authored stage opacity curves and native-rendered canonical scene backgrounds. Thin perimeter changes and the URL use actual HyperFrames snapshot differences. Opaque original wipes, including cyan edges, are protected in BT.709 YUV. Every pixel outside the authorized rectangles remains from the published master in the offline intermediate.

The QP-0 offline intermediate is never a browser deliverable. After original AAC is remuxed unchanged, `export-compatible-video.py` makes one uniform H.264 High / level 4.1 / yuv420p stream at QP 1 and inspects every in-band SPS. This necessary compatibility encode introduces tiny quantization differences; final decoded pixels must not be described as bit-identical.

`verify-targeted-video.py` independently compares all 2,700 frames, rejects any unauthorized offline pixel change, requires every configured correction to change frames, checks settled gameplay against its actual source-frame sequence, measures final quantization, verifies uniform PTS, full decode, MP4 atoms and original AAC packet payloads/timestamps. Actual browser playback from beginning through natural end remains a separate required gate.

## Protected surrounding website

No visible website element, stylesheet, responsive layout, card, link, description, poster, navigation or footer is edited. The only intended website change is the invisible MP4 cache token and checksum-pinned release selection. Desktop and mobile screenshots with the video hidden establish before/after comparisons outside the player. README.md retains its pre-existing uncommitted bytes and is never staged. No individual game repository or deployment is modified.

Raw capture observations, all-frame scans, native snapshots, logs and browser reports are retained under ignored `evidence/targeted/` and the external baseline backup directory. Physical-device playback and listening through physical speakers are not claimed.
