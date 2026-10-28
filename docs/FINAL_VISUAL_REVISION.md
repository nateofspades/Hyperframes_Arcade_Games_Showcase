# Final visual/gameplay revision

Status: completed, pushed and live; final render, deployed website, media bytes and all five responsive viewport tests verified.

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

Measured title coordinates and font sizes are scaled from `compositions/intro.html`, using a locally served Archivo Black font with its OFL license. Cyan web accents, the favicon and all eight card titles use `#40ECEC`; the secondary branding line retains the opening's `#a996ff`. Category labels are removed. Existing cards, screenshots, destinations and controls remain. Chromatic Cure's exact requested description is shared with the video. Versioned media/favicon URLs avoid stale browser caches.

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
- The actual short HyperFrames draft passed: 1920×1080, 2 seconds, 5 FPS, 10 frames, and unchanged master source. Its decoded frame was visually inspected. The editable preview returned HTTP 200.

## Verified delivery render

- New MP4: `renders/Arcade_Games_Showcase-2026-10-28T15-43-04-812Z.mp4`.
- SHA-256: `086e3b14cce03bf4185df93b5dfc9ab371bd9f58724a99599d41ee38be4451ba`.
- Exactly 90.000000 seconds, 1920×1080, 30 FPS, 2,700 frames, H.264, stereo AAC at 48 kHz; 12,056,605 bytes.
- Existing production settings and one worker retained. Software screenshot capture took 127m 22.7s. HyperFrames completed without best-effort recovery.
- Full-file strict decode passed. Black-interval validation passed. All ten gameplay-only motion comparisons passed (eight games, including three Aim mini-games).
- Decoded PCM audio is bit-identical to the previous published MP4: SHA-256 `7465c12a92f62749252a26e0cc4e083be352f76e8deb35fe6e9115ad01ded03d`. Soundtrack timing, fades and content are preserved.
- The final decoded 12-frame contact sheet and ten four-frame gameplay motion strips were visually inspected: clean rectangular gameplay, genuine HUDs, native activity, consistent external title/description styling, and no clear rendering/crop/control-overlay defects. QA artifacts remain local under `evidence/final-revision/`.
- Final local Playwright QA passed all five requested viewport sizes against the new MP4, including real playback/pause/seek, exact card copy/colors, fonts/images, links and overflow/error checks.
- The new public release asset's uploaded size and SHA-256 digest were read back from GitHub and matched the local MP4. The previous release remains intact.
- Release: https://github.com/nateofspades/Hyperframes_Arcade_Games_Showcase/releases/tag/showcase-video-2026-10-28-final
- Pages deployment succeeded for `400605917ded39781d9e2629698697c4916022d5`: https://github.com/nateofspades/Hyperframes_Arcade_Games_Showcase/actions/runs/40743592864

## Live deployment verification

- Live page: https://nateofspades.github.io/Hyperframes_Arcade_Games_Showcase/
- Actual live HTML is byte-identical to the local tested website (SHA-256 `9294a74c998e4dd9259623da9d0b4e121cbc58d1b5dca1d6c9fe35b2af9974a5`). Thus all eight exact source/card descriptions also match the deployed cards.
- The live versioned MP4 returned HTTP 200, `video/mp4`, 12,056,605 bytes and the exact verified render SHA-256 above. A real 1,024-byte range request returned HTTP 206. Visitors use `media/showcase.mp4?v=086e3b14cce0`.
- Playwright passed the actual canonical live URL at 1920×1080, 1366×768, 768×1024, 390×844 and 320×568. Real video playback/pause/seek passed at every size. All eight game URLs returned HTTP 200. Exact text/colors, local font/image loads, focus/hover behavior, overflow and JavaScript/required-asset error checks passed. All five live screenshots and native-resolution mobile top crops were visually inspected.
- Final independent source verification and all 15 regression tests passed again after rendering; strict full-file decode exited 0.
- README SHA-256 remains `10611d222c07f9eef5496cda1243b5dd7eb847f0b002f7d4f2d211b36b0e524f`. It was never staged in any assignment commit. Neither README nor its embedded poster changed in the assignment's published commits. Its preserved older local bytes intentionally remain unstaged against the fetched README-only history.
- Both preserved MP4 hashes still match their pre-edit values; the old GitHub release asset still exists with its original SHA-256. No individual game repository, deployment or engine was modified.

## Limitations

Browser QA uses Chromium/Playwright viewport emulation, not physical mobile devices or a separate Safari run. Gameplay is actual engine output driven by paced scripted inputs, not a claim of human-operated recording. Rally retains a brief genuine point/reset; Brika features single-ball rebounds/brick destruction rather than a guaranteed power-up or multiball moment. Native HUD terminology (such as Cycle and Anchors Left) is retained instead of inventing Level/Viruses counters. No known blocking delivery issue remains.
