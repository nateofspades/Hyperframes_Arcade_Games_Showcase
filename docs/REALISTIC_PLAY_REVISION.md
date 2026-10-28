# Realistic-play revision

Historical notes for the earlier realistic-play capture pass. The later authorized final visual revision supersedes its scope, media selection and delivery status; see [FINAL_VISUAL_REVISION.md](FINAL_VISUAL_REVISION.md). The notes below describe the earlier takes, not the current final-render status.

This revises the existing 90-second HyperFrames film. The opening, ending, scene order, transitions, soundtrack and the Float Tweet Bounce, Serpent Supper and BrikaVolt scenes are preserved. The original source media, original project and reference MP4 remain untouched.

## Affected scenes

- 4 Block Theory: genuine new public-game recording; deliberate positioning and rotation taps, observation pauses, and visible soft falling instead of hard drops. Includes the game's actual Score, Record, Lines, Cycle, Intake and Reserve displays. Existing control buttons/instructions were hidden for capture without changing game state or board/HUD geometry.
- Chromatic Cure: genuine new recording with widely spaced positioning/rotation actions and intermittent soft-drop taps, not hard drops. Wider source framing includes the real Level, Score, Record, Anchors Left and Incoming Pair displays. Existing controls are not emphasized.
- Rally Reactor: genuine new recording of the real court and scoreboard at medium difficulty, with a reaction interval rather than frame-perfect paddle tracking. The showcase stage no longer adds filled blue side panels or a decorative edge over the game.
- Orb Onslaught: genuine new recording with short walking bursts, pauses and discrete fire-button holds rather than continuous fire/zigzagging. The real sector, score, best, lives and timer remain visible. Delivery footage is modestly slowed to 85% of the native take; `orb-native.mp4` preserves the unretimed capture. Game physics and UI values were not modified. The stage's blue side panels/decorative edge were removed.
- Aim Alley Arcade: new captures of Target Practice, Moving Targets and Precision Shooting. Pointer motion has a speed limit and eased approach; moving targets are reacquired periodically, and shots have deliberate gaps. Includes the native score, time and accuracy HUD. Aim does not display a record in its active-game HUD; its separate instructions/results screens are not inserted merely to show that value. Instruction tips are hidden, not replaced. Filled showcase side panels/decorative edge were removed.

## Authenticity and pointer handling

`scripts/capture-revision.mjs` uses the real public URLs and real keyboard/pointer events. Game state is observed, never written. A frame-stepped clock advances native gameplay at 30 FPS. HUDs are real DOM screenshots refreshed whenever their content changes; live game/preview canvases are copied from their actual rendered pixels on every frame. Nothing reimplements the games or draws invented HUD information.

Aim uses the browser's CSS `cursor: crosshair`, not an in-canvas crosshair. Browser screenshots omit native cursors. `scripts/read-native-cursor.mjs` and `scripts/native-cursor.py` captured Chromium's actual X11-selected crosshair on display :98. The unchanged sprite is preserved as `assets/cursors/aim-native-crosshair.png`. `scripts/include-native-pointer.py` includes that captured cursor at every recorded input coordinate, using its actual hotspot. This is cursor inclusion, not an invented aiming aid or synthetic game UI. Its coordinate, clipping, alpha, metadata and real FFmpeg encode paths have regression tests. Pillow is an optional recapture/postprocess dependency; ordinary rendering uses the included MP4 assets and needs no Pillow.

New footage lives under `assets/footage/revision/`; earlier clips remain at their original paths. The historical generator and old rapid-input capture scripts were not rerun over the baseline.

## Reproduction and safety

- New captures refuse to overwrite existing takes. Preserve/move a known take deliberately before another experiment.
- Public-game capture is optional and needs Playwright Chromium. Native cursor extraction additionally needs Xvfb, X11/XFixes and Pillow. Rendering does not visit game URLs.
- Capture state/input ledgers are stored under `docs/provenance/revision/` after successful capture.
- `docs/revision-media-manifest.json` supplements, rather than overwrites, the baseline media manifest; `npm run verify:source` checks both.
- Use one capture/check/snapshot/render browser worker on this VPS.
- Checks, decoded visual review and a short real render must pass before the final `npm run render`. New exports go under `renders/` with a timestamp; neither original MP4 is a target.
- GitHub Pages and video-platform publication remain disabled. No commit or push is part of this request.

## Limitations

These are controlled scripted-input recordings, not recordings of a human operator. The goal is human-paced, imperfect play, not a claim that a human played. Fresh-session records and scores are whatever the real games displayed; no historical high scores were invented. Native HUD text is much more available than in the canvas-only baseline, but some small labels still require desktop-size playback. Orb's native timer advances with its modestly retimed footage. Music is retained from the original film; audio verification is measured, not a subjective listening review.
