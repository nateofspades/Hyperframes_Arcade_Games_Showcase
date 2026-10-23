# Editing the preserved showcase

## Source of truth

The checked-in index.html and compositions/*.html are the original editable film, copied byte-for-byte before migration. CSS and GSAP scripts are embedded in the scene templates. Assets are referenced relative to the composition root (`assets/...`), including inside sub-compositions. The baseline file hashes are recorded in docs/provenance/preserved-compositions.json; they are historical evidence, not an instruction to reject future authorized edits.

Do not run the historical build-composition.mjs generator blindly. It contains an embedded game-definition array and can regenerate/overwrite the HTML and scenes.json. Review and synchronize any later hand edits before deliberately using it. All normal npm commands operate on the existing source without regeneration.

## Common changes

- Opening/closing copy: compositions/intro.html and compositions/outro.html.
- Scene title/color/type/position: the relevant compositions/<game>.html styles and markup.
- Scene order/length: index.html hosts, child timelines, video duration/trim attributes, and transition start times. Update scenes.json, STORYBOARD.md, SPEC.md and soundtrack cut cues for consistency.
- Aim Alley: the 15-second scene contains Target Practice 0–6, Moving Targets 6–11 and Precision Shooting 11–15 seconds in local scene time. Preserve local media timing bases.
- Gameplay replacement: assets/footage/*.mp4; preserve replaced takes elsewhere or with a deliberate source filename, update trims and docs/media-manifest.json, verify duration/keyframes, and refresh relevant authentic stills only if needed.
- Music: swap the root audio src, or deliberately edit scripts/music.js and regenerate. The current WAV is already present; do not regenerate as setup. Preserve the prior audio before running a generator that overwrites it.
- New aspect ratio: change root/sub-composition dimensions and intentionally re-layout every board, title, transition and CTA. It is not a simple MP4 resize. Preserve the existing landscape baseline and render to a new path.

Load the installed HyperFrames skill and relevant CLI/media/registry references before edits. Keep deterministic paused timelines registered in window.__timelines. Never drive video playback/seek manually; the renderer owns media. Clip timing, CSS/GSAP transform conflicts and composition mounting rules matter.

## Development loop

1. Inspect git status, fetch origin/main and preserve uncommitted edits before integration.
2. Read .hermes.md, README.md, REVIEW.md and the source being changed. Check HyperFrames history and timeline; do not overwrite desktop-app edits.
3. Make the requested code/media change only. Update source manifests when media actually changes.
4. Run npm run verify:source and npm run check. Inspect resulting snapshots, not just exit codes. Range checks omit whole-film craft/motion sweeps; check visible motion independently.
5. Preview locally with npm run preview -- --port 3018; verify the printed URL returns HTTP 200. Use an SSH tunnel from the user's machine. Do not expose the editor publicly.
6. Run npm run test:render for a 2-second actual render of the original Block scene when checking the toolchain. For other edits, build an ignored sample from the affected existing scene; do not silently substitute a new design. The smoke test intentionally has no audio; full-project audio is present in the master and reference.
7. A requested final render uses npm run render, which generates a timestamped file in renders/. Never target an original/reference MP4. Inspect FFprobe and decoded output. The old verifier timing/crops describe the baseline; revise them for changed scene order, length or aspect ratio.
8. Review staged files, run the required tests, commit one genuine completed logical revision, push main, then verify origin's commit. Keep Git author email associated with nateofspades. No empty commits or unnecessary force pushes.
9. Keep GitHub Pages disabled unless explicitly asked to publish; do not push any deployment workflow as an incidental video edit.

## Optional recapture and inspection tools

capture.mjs records genuine rendered game canvases with real controls and frame-stepped game clocks. It uses the public game URLs listed in README, not a custom game renderer. ARCADE_CHROME_PATH selects an existing Chromium; absent that, Playwright's normal executable lookup applies. Optional probe.mjs/capture-live.mjs are retained historical diagnostic experiments, not required for rendering. Avoid rerunning captures without preserving existing media first.

puzzle-controls.test.mjs additionally imports game code from separate inspection checkouts. On this VPS, ARCADE_REFERENCE_ROOT=/root/arcade-showcase-video/references/ points to those preserved checkouts (include the trailing slash). A new clone does not contain those game repositories. This optional recapture-controller test is not part of normal render validation; it must not be reported as tested unless actually run.

## Source lineage and safe paths

Original tree: /root/arcade-showcase-video (do not edit).
Working copy: /root/Hyperframes_Arcade_Game_Showcase.
Reference archive: /root/arcade-showcase-archive/Arcade_Games_Showcase.original-reference.mp4 (do not overwrite).
Local setup audit: /root/arcade-showcase-setup (not part of the public repo).

The copy relocates scripts from hardcoded original-project paths to paths derived from each script's file. This prevents an edit/render helper in the new repo from accidentally writing into the original tree. Composition and current media bytes remain preserved.
