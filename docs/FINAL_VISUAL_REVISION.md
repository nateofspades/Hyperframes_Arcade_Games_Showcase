# Final visual/gameplay revision

Status: source implementation, capture review, HyperFrames audits and short draft verified; full delivery render in progress, deployment pending.

## Preservation and scope

- Starting local commit: `cec589883eb12a6b224276a9a497a9777d68a2fb`.
- Fetched remote base: `0944856` (eight README-only commits ahead). Advanced the local branch/index to that existing history without writing the working README. Its older local bytes remain unstaged and must not be committed.
- Starting working README SHA-256: `10611d222c07f9eef5496cda1243b5dd7eb847f0b002f7d4f2d211b36b0e524f`.
- Recoverable pre-edit source (including previous uncommitted work): `/root/arcade-showcase-backups/20261028T052400Z/source-before-revision.tar.gz`.
- Previously published MP4 backup: `/root/arcade-showcase-backups/20261028T052400Z/previous-published-showcase.mp4`, SHA-256 `915c49ea5daecd2e0f1bded2190e1b916e43fd6d1c504d8f3099d4e320bf67c6`.
- Untouched original/reference MP4: `/root/arcade-showcase-archive/Arcade_Games_Showcase.original-reference.mp4`, SHA-256 `7faa983662b7c1ac7b7eee33f283e42d826f0b6fa2273e61f73029f51e831c82`. Original tree `/root/arcade-showcase-video` remains untouched.
- No individual game repository or deployment is changed. Recording uses public game URLs with temporary browser-only presentation CSS and actual keyboard/mouse inputs. No game state, physics, scores, or renderer are replaced.
- Original opening, soundtrack, 90-second timing, game order and transitions are preserved. Only gameplay presentation and ending are revised.

## Website

Measured title coordinates and font sizes are scaled from `compositions/intro.html`, using a locally served Archivo Black font with its OFL license. Cyan web accents and all eight card titles use `#40ECEC`; the secondary branding line retains the opening's `#a996ff`. Category labels are removed. Existing cards, screenshots, destinations and controls remain. Chromatic Cure's exact requested description is shared with the video.

Local Playwright QA passed all five requested viewports, real MP4 playback/pause/seek, fonts/images, eight link HTTP checks, exact copy/colors, and no horizontal overflow/errors. The local QA server supports MP4 byte ranges, unlike Python's basic HTTP server.

## Shared gameplay text

`assets/game-segment.css` and `assets/game-segment.js` are canonical source partials, embedded into all eight existing scene templates by an explicitly invoked synchronizer. `node scripts/sync-game-segments.mjs --check` verifies parity without rewriting copy/media. This avoids uncertain asynchronous script/style loading in HyperFrames template/shadow mounts. The historical composition generator is not used.

Titles are Archivo Black, 900, white, 72px with -2px tracking. Description text uses Inter 32px/1.5 and the scene's original accent. A reserved two-line title region fixes the description's starting position even when titles wrap. Decorative lines are 95×5px. Entrances are 0.35–0.45 seconds with restrained stagger; exits share the same timing relative to each scene's end. External genre labels, slogans, Aim subgame captions and progress decorations are removed. All eight descriptions are compared against website-card text by `scripts/verify-presentation.py`.

## Genuine gameplay

- Block: new paced recording after 65 seconds of real warm-up; compact real Score/Record/Lines/Cycle HUD above the full board. Source shows lines 8–11 and actual clears; the featured trim includes a clear. Beige side panels and controls are excluded.
- Chromatic: new paced recording after 55 seconds of real warm-up; compact native Level/Score/Record/Anchors Left HUD above the full board. Source shows real matches, score 980–1240, and anchors decreasing from 2 to 1. No oversized side panel or controls.
- Rally: reuse the verified revision take and its real scoreboard, with reaction-spaced paddle control. A brief real point/reset may occur; no artificial side bars.
- Orb: use the preserved native-speed revision take instead of the previous 85% retiming. Real splits, score/lives/timer remain; no altered physics.
- Float: new native full-DOM capture, with score/best visible and several successful obstacle passes. Score advances from 1 to 9 in the source take. Its transparent HUD is never restored from an opaque cached patch.
- Serpent: new genuine capture with score/record/level, active food collection, and a serpent growing from 28 to 35 cells in the source take; score advances from 250 to 320.
- Brika: new paint-synchronized Playwright screenshots preserve the full native neon court and Score/Record/Sector/Lives HUD. Source score advances from 400 to 1000 with three lives. Earlier blank CDP captures were rejected. Temporary fixed recording-layout bounds and screenshot paint synchronization affect presentation only, not engine state or physics.
- Aim: reuse three genuine revision takes with recorded eased cursor motion and deliberate click spacing. The captured Chromium-native crosshair is included at logged input coordinates/hotspot, not invented as a gameplay aid. Real score/time/accuracy remain; external mini-game labels are removed.

New media is separate from baseline assets. Capture ledgers and checksums are preserved. The footage is controlled scripted-input play, not a claim that a human operator played it.

## Closing

The existing eight-game 2×4 grid is retained with consistent tiles and authentic refreshed stills. Portrait previews keep their aspect ratio; a separate dark/soft source-derived backdrop fills side regions without stretching foreground gameplay. The headline is `8 ARCADE GAMES.` / `ONE COLLECTION.`; CTA `PLAY FREE IN YOUR BROWSER.`; URL `nateofspades.github.io/Hyperframes_Arcade_Games_Showcase`.

The static background treatments are baked once through an actual one-frame HyperFrames PNG-sequence render by `scripts/bake-closing-backdrops.py`, then cropped into the eight backdrop JPEGs. Canonical settings are exposure -2 and blur 0.45. The closing composition therefore needs no live WebGL treatment passes; its authentic foreground stills remain untouched. The recipe is recorded in `docs/provenance/closing-backdrop-treatment.json`. This resolves the software-GPU audit/render cost without replacing the effect with CSS filters or fabricated imagery.

## Review and verification status

- Fifteen existing Python regression tests passed, including native-cursor coordinate/clipping/encode behavior.
- Actual `codex review --uncommitted` ran twice and exited 0. The initial missing-closing-stills finding was resolved by adding the authentic assets. The second review identified no concrete actionable regressions, explicitly without certifying rendered appearance. Model-discovery/auth-refresh and rollout-recording warnings did not prevent review output.
- An additional actual `codex review` with read-only instructions reviewed the final static-backdrop bake and bounded audit ranges and exited 0: no concrete material regressions. It independently verified both asset manifests and shared-source parity without starting another browser/render worker.
- Source verification passes for all 60 baseline/revision assets. Exact description/shared-source/media-aspect/trim checks pass. All eight source-footage motion sequences were decoded and visually inspected.
- Card dimensions were compared against the pre-edit website at all five requested viewports: all 40 card comparisons had zero width/height delta after balancing padding around the removed labels.
- Full `npm run check` passed all six bounded ranges and all 12 original sample times, with nonzero runtime/layout/contrast audits. Splitting Aim's three mini-games and baking the closing backdrops resolves the fixed 120-second audit deadline on this software-GPU VPS. No audit type or original sample is skipped. All 12 resulting composition snapshots, including the full closing screen, were visually inspected.
- The actual short HyperFrames draft passed: 1920×1080, 2 seconds, 5 FPS, 10 frames, and unchanged master source. Its decoded frame was visually inspected. The editable preview returned HTTP 200. The full production render is running with one worker; final decoded/audio and live deployment verification remain pending.
