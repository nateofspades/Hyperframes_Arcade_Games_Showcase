# Three final gameplay-area corrections — local review revision

## Baseline and scope

This revision starts from the latest **unpublished** targeted export, not from
GitHub Pages: `renders/Arcade_Games_Showcase-targeted-2026-10-30T07-50-05Z.mp4`.
Its SHA-256 is `0a29e02986f54daed80da35959b1339b26c28bb25df3e13165c7fc8479e8b741`;
its modification timestamp is 2026-10-30 08:40:55 UTC. The live player still uses
the older October 29 export, SHA-256
`4c95e6940e09f1676de8614a742bf79ded153c889fdece94238d4d684c2950ca`.

The complete working source (including pre-existing uncommitted changes), file
checksum manifest, Git status, and a separate copy of the unpublished MP4 are
preserved at `/root/arcade-three-final-backup-2026-10-31/`. The original unpublished
render remains in `renders/` too. The preserved original project and reference
archive are never render targets.

Only the Chromatic recording reference and the Rally/Aim padding backgrounds
change. All titles, descriptions, canonical style/motion blocks, opening,
transitions, other gameplay, closing screen/URL, timing, soundtrack, website,
README bytes and individual game repositories remain outside this iteration's
edit allowlist. No commit, push, release or deployment is authorized.

## Corrections

- **Chromatic:** new real-engine capture with deliberate rose-stack completion,
  both vertical and horizontal placements, and native four-color vertical clears.
  Positioning uses paced real keyboard events; descent uses ordinary one-cell
  soft drops, not instant hard drops. No board state, rules, scoring, animations,
  velocities, or outcomes are injected. Native HUD styling and the exact
  316×706 capture rectangle match the previous recording; the authored stage
  remains at the same position, size, aspect ratio and timing. A rejected early
  hard-drop pilot is retained only under ignored evidence, not used for delivery.
- **Rally:** a 956×12 background-only PNG continues the native HUD's inherited
  radial-gradient shading into the existing upper strip. A local robust median
  excludes the eyebrow-label glyphs from sampled background pixels. The strip
  uses the existing pseudo-element's padding box; its perimeter, all labels,
  original video/trim, ball, paddles and court are untouched.
- **Aim:** a transparent 16×636 PNG continues the native paper HUD, horizontal
  divider, darker game background and grid. The grid is sampled exactly one
  native 32-logical-pixel period to the right, preserving line phase and y.
  The 12-pixel added strip is filled; only below the HUD does the extension
  cover the obsolete inner native left edge. The original SCORE pixels remain
  uncovered via alpha. No targets, crosshair, footage/trim or game geometry move.

## Export and verification contract

`docs/final-three-render.json` explicitly pins the unpublished baseline and three
small authorized rectangles. The existing selective-render workflow uses actual
before/after HyperFrames snapshots for the two static background fills and native
captured footage for Chromatic. It retains every offline YUV sample outside the
three masks, including original opaque wipe pixels. A wholesale browser rerender
would unnecessarily change approved decoded imagery; this workflow avoids that.

`scripts/render-final-three.py` invokes the existing compositor, remuxes the
original AAC without re-encoding, then invokes the existing compatibility export
and independent 2,700-frame verifier. The lossless offline intermediate is not a
browser deliverable. Delivery is one uniformly encoded H.264 High / level 4.1 /
yuv420p stream at QP 1 with original AAC payloads/timestamps. This introduces
small unavoidable quantization differences, never claimed to be bit-identical.

Source scope, actual HyperFrames checks/snapshots/smoke render, decoded Chromatic
behavior, all-frame masked comparison, full FFmpeg decoding, in-band SPS,
unchanged audio and beginning-to-ended browser playback are separate gates.
Physical-device playback and subjective listening through speakers are not
claimed.

## Final status

Completed locally for Nathan's review. No Git commit, push, release update,
Pages deployment or individual-game repository/deployment change was performed.

- Final MP4: `renders/Arcade_Games_Showcase-final-three-2026-10-31T08-19-27Z.mp4`.
- SHA-256: `506739dabf78f4d85ccc26939e17e75f2ce11b53dc2b2cf2ab163b9a657a2b98`.
- 43,771,405 bytes; exactly 90.000 seconds; 1920×1080; 30 FPS; 2,700 frames.
- Uniform H.264 High / level 4.1 / yuv420p / BT.709; AAC LC stereo, 48 kHz.
  Every inspected in-band SPS is profile 100 and level 41.
- All 68 source assets passed checksum/reference verification. All 23 regression
  tests passed, including optional repair dependencies. All six HyperFrames
  audit ranges passed with zero lint/runtime errors or warnings. The corrected
  strict two-second HyperFrames smoke render produced ten 1080p/5 FPS frames.
- Chromatic's nine-second take contains vertical locks at source frames 55/105
  and horizontal locks at 164/197/234. No hard-drop inputs occur. The four-rose
  group forms at video 17.50 s and clears at 17.766667 s; the four-blue group
  forms at 21.80 s and clears at 22.066667 s. Native score moves 0→140→280 and
  remaining anchors 8→7→6. All 270 source frames passed the board-blank scan;
  241 settled source/output frames matched exactly before delivery quantization.
- Independent comparison of all 2,700 frames found zero unauthorized YUV sample
  changes in the lossless master and preserved original opaque wipe pixels.
  Only 978 frames changed, within the three authorized time/area masks.
- The compatible delivery's minimum full-frame PSNR against the lossless master
  is 67.685687 dB; maximum YUV component quantization error is 3/255. These are
  tiny encoding differences, not a claim of globally bit-identical video pixels.
- Complete FFmpeg decoding passed; timestamps are uniform; the container is
  complete and fast-start; the full black-frame scan detected zero intervals.
- Original AAC packet payloads/timestamps are identical. Decoded PCM is also
  identical: SHA-256 `7465c12a92f62749252a26e0cc4e083be352f76e8deb35fe6e9115ad01ded03d`.
- Decoded visual inspection passed for both puzzle clears, four Rally times,
  six Aim times spanning all three modes, every game, the 0:41 boundary, closing
  screen and final frame. Before/after source snapshots have zero changed pixels
  outside the padding masks. See `visual-review.json` and the decoded sheets.
- Both Chromium and Firefox played from zero through natural `ended=true` at
  90 seconds, with decoded unmuted audio and no media errors. Each captured all
  19 required scene/boundary samples and passed the settled Float-field check.
- Limitation: the CPU-constrained software-rendered VPS was not real-time.
  Chromium reported 1,335 display drops; Firefox reported 1,907. These are
  browser presentation drops, not missing encoded frames: all 2,700 file frames
  decoded and passed comparison. Physical-device smoothness and speaker
  listening have not been tested.
- All 218 backup checksums remain intact. Among pre-existing files, only the
  five authorized source/QA files changed. Those and all new project files are recorded in
  `evidence/final-three/changed-project-files.json`. All external copy, canonical
  typography/motion, master timing, other gameplay, opening, closing, soundtrack,
  README's pre-existing uncommitted bytes, and website source remain unchanged.
- Read-back verified the live webpage still has SHA-256
  `44de47c040905b4720edc385609a3eeb97d79330ec67938009be9b72068f05e3`
  and its older MP4 still has SHA-256
  `4c95e6940e09f1676de8614a742bf79ded153c889fdece94238d4d684c2950ca`.

Evidence and actual command outputs: `evidence/final-three/`. Primary reports:
`verification.json`, `source-scope.json`, `chromatic-behavior-verification.json`,
`visual-review.json`, `audio-pcm-verification.json`, `final-review-result.json`,
`browser-chromium.json`, `browser-firefox.json`, `final-blackdetect.log`,
`regression-tests.log`, `hyperframes-check.log` and `smoke-probe.json`.
