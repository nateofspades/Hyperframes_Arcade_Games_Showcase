# Approved October 31 showcase publication

Nathan approved the latest early-morning October 31 video and explicitly requested committing its source and publishing it to the existing GitHub Pages webpage on October 31, 2026. This supersedes the earlier local-review-only restriction recorded in FINAL_THREE_CORRECTIONS.md. TARGETED_CORRECTIONS.md describes the preceding October 30 iteration, not the final publication state.

## Exact approved artifact

- Local export: `renders/Arcade_Games_Showcase-final-three-2026-10-31T08-19-27Z.mp4`
- Completed: October 31, 2026, 09:04:15 UTC (05:04:15 EDT).
- SHA-256: `506739dabf78f4d85ccc26939e17e75f2ce11b53dc2b2cf2ab163b9a657a2b98`
- Size: 43,771,405 bytes.
- Duration: 90 seconds; 1920×1080; 30 FPS; 2,700 video frames.
- Video: uniform H.264 High, level 4.1, yuv420p; audio: AAC LC.
- Release tag: `showcase-video-2026-10-31-approved`.
- Release asset: `Arcade_Games_Showcase-final-three-2026-10-31T08-19-27Z.mp4`.

The approved MP4 is published without rerendering or transcoding. The previous October 29 release remains available for rollback. The deployment workflow verifies the full SHA-256 before assembling the Pages artifact; the player cache identifier is `506739dabf78`.

## Source and preservation

This source revision includes the October 30 targeted corrections and October 31 final three corrections, authentic gameplay media, padding extensions, provenance, source manifests, capture/export helpers and regression checks. The editable HTML compositions remain authoritative. Finished MP4s, local evidence, caches and credentials stay out of Git history.

A pre-publication backup of all pending files and a separate copy of the approved MP4 is at `/root/arcade-publication-backup-2026-10-31/`, with checksums. Earlier baseline backups and the original project/reference archive remain untouched. Unrelated pre-existing README changes are preserved locally and excluded from this commit.

Normal HyperFrames rendering has all referenced source assets in Git. The historical selective-export helpers additionally require the preserved local baseline MP4s, backup paths and ignored `evidence/` snapshots named in their JSON configurations; they are not a self-contained fresh-clone export path. Optional repair helpers require NumPy/OpenCV, outside the normal rendering dependencies.

## Verification and scope

The existing final-three reports document source-scope checks, all-frame comparison, uniform codec configuration, identical original audio, decoded visual review and complete Chromium/Firefox playback. Physical-device smoothness and listening through physical speakers are not claimed.

Publication additionally reruns source verification, regression tests, HyperFrames checks and full decoding. After deployment, live webpage and complete MP4 read-back must confirm the new cache identifier and exact approved checksum; live browser playback must reach the natural end with audio and no media errors. Fresh execution reports are retained under ignored `evidence/publication-2026-10-31/`.

Pre-publication execution passed source verification for all 68 assets, all six HyperFrames audit ranges, JavaScript/Python syntax checks and strict full-file FFmpeg decoding. The regression suite completed 23 tests with one optional NumPy/OpenCV repair test skipped and all remaining tests passing. The live baseline webpage and publication source compare identically after normalizing only the video cache identifier.

Only the video's invisible cache identifier and checksum-pinned release selection change on the webpage. Its visible design, copy, cards, thumbnails, poster, navigation and game links remain unchanged. No individual game repository/deployment or external video platform is modified.

Live URL: https://nateofspades.github.io/Hyperframes_Arcade_Games_Showcase/
