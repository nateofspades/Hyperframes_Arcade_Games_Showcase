# Float Tweet Bounce repair and browser-compatibility correction

## Two distinct defects

The original recording intermittently captured an empty canvas while retaining the HUD. Saved pre-encoding JPEGs already show the defect, so the original blinking was not caused by the website or H.264 decoding. There were 67 damaged source frames in 1–3-frame runs, including 46 visible frames in the nine-second showcase segment. Bidirectional optical flow reconstructed these short gaps from adjacent intact gameplay; no gameplay was re-recorded or retimed.

The first delivery repair introduced a separate compatibility regression. Its single `avc1` track initially declared H.264 High, profile_idc 100 / level_idc 50, but in-band SPS parameters switched to lossless High 4:4:4 Predictive, profile_idc 244 / level_idc 40, at exactly 41 seconds. The ordinary High stream resumed at 57⅔ seconds. Matching dimensions, yuv420p pixels, frame rates, timestamps and keyframes did **not** make those encoding configurations interchangeable.

That profile/configuration change explains rejection at the Float boundary by stricter/hardware browser decoders. The file itself was complete: 90 seconds, 2,700 frames, valid MP4 metadata, correct `video/mp4` MIME type, working HTTP ranges and a checksum-identical Pages deployment. Software FFmpeg and headless browser acceptance were insufficient evidence of broad compatibility. The unsupported-profile delivery is superseded and retained only as a diagnostic backup.

The previous complete working video (`086e3b14cce03bf4185df93b5dfc9ab371bd9f58724a99599d41ee38be4451ba`) was restored to Pages first, in commit `a17833f`, while the permanent correction was validated.

## Safe delivery method

Lossless repair output is an **offline intermediate**, never a stream-copy island for an `avc1` website delivery. `scripts/export-compatible-video.py` decodes the corrected master and encodes one uniform H.264 High / level 4.1 / 8-bit yuv420p stream. It copies the original AAC packets and timestamps unchanged and finalizes MP4 with `+faststart`. No HyperFrames compositions, footage timing, scene layouts, text, colors, animations or transitions are regenerated.

A single full-video encoding pass is necessary to remove incompatible parameter changes reliably. QP 1 provides near-lossless preservation, rather than the incompatible QP-0 lossless profile. Tiny encoding-only pixel differences are unavoidable; the corrected delivery must not be described as pixel-identical. Its actual minimum per-frame PSNR against the lossless repaired master is 64.97 dB, with mean SSIM 0.9999048448. For the 2,654 unaffected frames, which the repaired master preserved exactly from the working film, minimum PSNR is 65.27 dB and minimum SSIM is 0.999764.

The Float source asset is also normalized to ordinary High / level 4.1, retaining 474 × 840, 14.000 seconds, 30 FPS and 420 frames. Its original color metadata is retained. All 420 source fields contain gameplay; the minimum inspected field average luma is 86.0085. Its checksum is deliberately updated in the revision manifest.

Example safe export (new output path required):

```sh
python3 scripts/export-compatible-video.py LOSSLESS_REPAIRED_MASTER.mp4 NEW_DELIVERY.mp4
```

The exporter refuses overwrites and examines every in-band SPS, not just ffprobe's initial profile. Regression tests reject mixed profile 100/244 streams, reject missing SPS data, and exercise a real lossless-to-compatible conversion without retiming.

## Final video and objective checks

File: `renders/Arcade_Games_Showcase-compatible-2026-10-29.mp4`.
Size: 44,438,446 bytes.
SHA-256: `4c95e6940e09f1676de8614a742bf79ded153c889fdece94238d4d684c2950ca`.

- Exactly 90.000 seconds, 1920 × 1080, 30 FPS, 2,700 video frames; video starts at PTS zero.
- H.264 High, level 4.1, yuv420p; every inspected SPS has profile 100 and level 41.
- AAC LC, stereo, 48 kHz, 90.000 seconds; audio starts at PTS zero.
- Complete FFmpeg decode with `-xerror -err_detect explode`: zero errors, 2,700 frames, no duplicated/dropped output frames.
- MP4 atom boundaries are complete; `moov` precedes `mdat`.
- Every frame compared against the corrected master at full resolution; fidelity values above include the opening, every game, both Float boundaries and closing.
- Original AAC packet payloads, PTS/DTS and durations are identical. Decoded audio SHA-256 remains `7465c12a92f62749252a26e0cc4e083be352f76e8deb35fe6e9115ad01ded03d`.
- Source checksum verification passes for all 60 assets; all 19 regression tests pass.
- All 270 Float segment frames decode; all 240 fully visible gameplay fields are nonblank and distinct, with minimum field standard deviation 25.6123. Intentional entrance/exit fades are not classified as defects.
- Fresh HyperFrames runtime/layout/contrast ranges 0–32, 32–68 (including Float), and 68–74 pass. Remaining unchanged source ranges are covered by the full-film fidelity comparison and completed browser playback rather than another redundant layout sweep.

Full-length browser verification is a separate mandatory gate before publication. `scripts/verify-browser-playback.mjs` plays at 1× from the beginning to the natural `ended` event, captures every scene and both Float transitions, checks the gameplay field, and samples actual decoded audio through Web Audio. It does not substitute seeking across 41 seconds for complete playback. Headless QA can use a private temporary PulseAudio null sink; this does not change the website or exported soundtrack.

The corrected local file completed Firefox playback from zero through the natural 90-second end, with no media errors, 19 scene/transition captures, 72 nonblank Float samples and 899 audio observations. Deployment is followed by the same complete test against the actual Pages URL in both Firefox and Chromium, plus a downloaded-file checksum comparison. The CPU-constrained software-rendered VPS can slow or drop display frames; this is not a physical-device real-time performance certification.

The actual Pages URL subsequently reached `ended=true` at 90 seconds in both Firefox and Chromium, with decoded unmuted audio, no media errors and 19 scene/transition captures each. The downloaded live MP4 matches the final checksum; MIME is `video/mp4` and byte ranges return HTTP 206 with the correct total size. Firefox's visual checker initially misclassified the original cut4 wipe at media time 49.712 seconds because its callback PTS lagged at 48.4 seconds. The raw report is retained and reviewed explicitly in `firefox-live-reviewed.json`: all 53 settled-gameplay observations pass. Sampling now requires both clocks inside 42–49 seconds; all 37 Chromium observations pass that corrected gate. The independent decoded-frame scan still covers the complete 270-frame Float segment, including its preserved fades/transitions.

## Preservation and publication

README.md retains Nathan's pre-existing uncommitted edits byte-for-byte and is never staged. All composition HTML, the seven other footage assets, opening, closing, music source, website styling, navigation, game cards and game links remain unchanged. No individual game repository is modified. Website source changes are limited to the video cache token; deployment changes select the new checksum-verified release asset.

Preserved working MP4: `renders/published-before-float-fix.mp4` and the October 28 release.
Preserved incompatible MP4: `renders/Arcade_Games_Showcase-float-fixed-2026-10-29T02-33-44Z.mp4`, `evidence/playback-recovery/published-defective.mp4`, and its original release.
Preserved source backups: `renders/float-before-blink-fix.mp4` and `renders/float-lossless-repaired-before-compatible.mp4`.
Neither `/root/arcade-showcase-video` nor `/root/arcade-showcase-archive` is changed.

Detailed probe, decode, per-frame PSNR/SSIM, source-field, browser and deployment evidence lives under ignored `evidence/playback-recovery/`. Physical-device testing and listening through physical speakers are not claimed.
