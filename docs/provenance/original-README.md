# Arcade showcase — editable HyperFrames project

Final deliverable: `Arcade_Games_Showcase.mp4` (only final after verification in `evidence/final-probe.json`).

## Source of truth

- `index.html`: 90-second master composition and cohesive music track.
- `compositions/`: eight game scenes, opening, closing and transition overlays.
- `scenes.json`: scene titles, timings, media trims and palette.
- `scripts/build-composition.mjs`: regenerates the HTML composition from its scene definitions. If editing HTML manually, do not rerun this generator without incorporating those edits.
- `assets/footage/`: real captured gameplay, not generated gameplay animation.
- `assets/stills/`: genuine extracted frames used by the opening and closing grid.
- `assets/arcade-circuit.wav`: original instrumental backing, provenance in MUSIC.md.
- `evidence/`: live discovery, capture states, validation and render verification.
- `references/`: separate read-only source checkouts used to inspect controls; existing game checkouts were not edited.

## Re-render

    cd /root/arcade-showcase-video
    npx --yes hyperframes@0.8.186 check --json --snapshots --samples 1 --range 0,32 --at 2,9,18,27 --timeout 90000
    npx --yes hyperframes@0.8.186 check --json --snapshots --samples 1 --range 32,68 --at 36,45,54,63 --timeout 90000
    npx --yes hyperframes@0.8.186 check --json --snapshots --samples 1 --range 68,90 --at 70,76,81,86 --timeout 90000
    npm run render -- --workers 1 --fps 30 --quality delivery --video-frame-format png --no-low-memory-mode --browser-timeout 120 --protocol-timeout 300000 --player-ready-timeout 120000 --no-best-effort --strict --output Arcade_Games_Showcase.mp4
    python3 scripts/verify-video.py Arcade_Games_Showcase.mp4
    python3 scripts/verify-motion.py Arcade_Games_Showcase.mp4

The three range checks avoid the CLI's full-audit deadline on this VPS; they do not evaluate whole-film craft/frozen sweeps. Decoded gameplay motion is checked separately. The successful delivery render used BeginFrame software capture and took about 92 minutes on this host. Run long exports as durable background jobs with a saved log. Source footage has one-second keyframe spacing; original takes are preserved in `assets/footage/original-takes/`. The old performance probe is preserved as `evidence/perf-probe.html.txt` so it cannot be mistaken for another root composition.

Node.js 22+, FFmpeg and the HyperFrames-managed Chromium are required. `package.json` pins HyperFrames; `package-lock.json` preserves JavaScript dependencies. GSAP is local in assets, not fetched at render time.

## Capture integrity

The delivery footage is captured frame-by-frame from the original live games' rendered Canvas elements. Playwright advances the browser clock at 30 frames/second while real keyboard and pointer input operates each game's own physics, collision detection, scoring and rendering. Capturing slowly on the VPS does not slow the final playback: each captured frame corresponds to 1/30 second of game time. No custom game renderer is used, and no scores/levels are injected. Game-state observations assist steering only. Aim Alley uses its existing `?test=1` read-only snapshot seam; no scenario or forced result is invoked.

The experimental `capture-live.mjs` and original WebM files, if present, are preliminary performance diagnostics, not the selected delivery footage. Live wall-clock capture dropped frames on this VPS, so delivery uses deterministic frame-stepped capture instead.

## Safe scope

No existing game repository, game source, deployment or profile configuration was changed. No commits, pushes, renames or video uploads are part of this project. The source checkouts here are inspection copies. Preview is local-only and can be reached through an SSH tunnel; it is not publication.

## Transfer

Use the existing Vultr host in Termius SFTP. Navigate remotely to `/root/arcade-showcase-video/` and download the MP4, the contact sheet, or the complete project. No web-server publication is necessary.
