# Float Tweet Bounce capture-blank repair

## Root cause and scope

The published 2026-10-28 MP4 (`086e3b14cce03bf4185df93b5dfc9ab371bd9f58724a99599d41ee38be4451ba`) inherited empty gameplay fields from `assets/footage/polished/float.mp4`. The original capture's JPEG `evidence/polished/float-0.jpg` already shows the HUD over an empty purple field, before FFmpeg encoding. The MP4 decodes without errors. This is capture-time canvas/compositor blanking, not a webpage, H.264 decoding, or HyperFrames animation defect. The evidence does not establish which browser-internal event cleared/omitted the canvas.

The recording contains 67 empty frames in runs of 1–3 frames. Its recorded states continue to show active gameplay. The nine-second composition uses source seconds 3–12; 46 damaged frames are visible after accounting for the existing entrance/exit visibility. No gameplay was re-recorded, no game repository was edited, and no composition HTML, text, style, positioning, duration, animation or transition was changed.

## Source repair

`repair-float-blinks.py` reconstructs only missing fields using bidirectional dense optical flow between adjacent intact captures. It does not retime the clip or hold frames in the visible segment. Intact frames are retained in their original planar YUV representation and encoded losslessly. A missing first frame outside the composition's used interval takes its first intact neighbour.

The asset remains 474 × 840, 14.000 seconds, 30 FPS, 420 frames. All 353 intact decoded source frames are pixel-identical. All 67 previously empty fields now contain gameplay; the inspected central field's minimum average luma is 85.9958 rather than the empty-field value near 46.

Original source SHA-256: `b15fbe992b2b4bf83453237454b4ee004569860127223ee47173ef5b2f0530e2`.
Repaired source SHA-256: `2adb62b42b9d00661a99d107b53c0cfe73941258d7c8d2f1cd4e49518c1e64cd`.

The previous source is preserved in Git and locally at `renders/float-before-blink-fix.mp4`. The exact previously published full MP4 is preserved at `renders/published-before-float-fix.mp4` and in its existing GitHub release. Neither original reference archive was changed.

Repair-only dependencies belong in a temporary venv, not the project's runtime dependencies:

```sh
python3 -m venv /tmp/float-repair-env
/tmp/float-repair-env/bin/pip install numpy pillow opencv-python-headless
/tmp/float-repair-env/bin/python scripts/repair-float-blinks.py \
  renders/float-before-blink-fix.mp4 /tmp/float-fixed.mp4 --region 0,0,474,840
/tmp/float-repair-env/bin/python -m unittest discover -s tests -v
```

The tool refuses to overwrite its output and rejects gaps longer than three frames. Large scratch buffers live outside the project so HyperFrames does not scan changing multi-gigabyte temporary files. The regression covers exact retention of intact frames, lossless output, and nonzero-start windows without duplicated frames.

## Minimal delivery assembly

The full film need not be rendered again. Apply the same repair to the gameplay rectangle `(1104,122,472,836)` at these zero-based published frame indices:

```
1243 1248 1253 1255 1257 1263 1264 1275 1281 1303 1307 1310
1311 1312 1317 1326 1330 1332 1346 1353 1354 1359 1361 1373
1375 1378 1380 1381 1390 1393 1404 1407 1411 1418 1424 1431
1439 1440 1441 1446 1478 1483 1486 1491 1492 1497
```

Use `--start 1230 --end 1730 --bad-frames <JSON-list> --empty-only --preset ultrafast`. Empty-only masking retains the existing HUD and transition foreground pixels in YUV, including their chroma samples. The resulting 500-frame island is lossless. The longer encoding interval is necessary to rejoin at the original keyframe at 57⅔ seconds, not permission to change Serpent Supper.

Copy the original video packets before 41 seconds and from 57⅔ seconds onward, concatenate head/island/tail with exact durations 41, 50/3 and 97/3 seconds, and remux the original complete audio stream without re-encoding. All three video sections have no B frames and the same 1/15360 time base; no DTS offset is needed. Preserve the original audio packet timestamps and use MP4 faststart.

Lossless H.264 uses the High 4:4:4 Predictive profile even though the pixels remain yuv420p. This changes the encoding profile inside the repair island and increases the file size; it avoids generational changes to unaffected pixels. Chromium decoding is explicitly checked; this is not a claim of physical-device or universal hardware-decoder testing. The original release remains available as a backup.

## Verification evidence

Local evidence is under `evidence/float-blink/` (not committed): original capture/MP4 contact sheets, source frame hashes, source signal statistics, repair frame lists, actual HyperFrames smoke render, all repaired final-frame review sheets, full-film pixel/audio comparison and browser playback reports. The source checksum gate passes, and all 16 regression tests pass in the repair venv. A real isolated two-second HyperFrames render yields 10 frames at 1920 × 1080 / 5 FPS and shows the corrected footage; it is not the delivery file.

Publication must retain the existing webpage and modify only its video cache token and the workflow's checksum-verified release asset selection. README.md and the composition files remain unchanged.

## Corrected delivery comparison

Output: `Arcade_Games_Showcase-float-fixed-2026-10-29T02-33-44Z.mp4`, 32,893,849 bytes.
SHA-256: `7d6e5d6d9b0244765f0c0ef6c675cb88090d525076ab5df1470b65428aedd90e`.

Every one of the 2,700 decoded frames was compared with the exact previously published MP4. Exactly the 46 listed frames differ, and every differing Y/U/V sample lies inside the gameplay rectangle. All 2,654 other frames are pixel-identical, including the entire opening, closing and seven other gameplay segments. The existing Float HUD and transition foreground pixels are protected. All repaired frames were inspected in two decoded review sheets; the central gameplay field remains present and consecutive gameplay frames are distinct.

Both complete AAC packet hashes/timestamps and the decoded PCM SHA-256 match. Decoded audio SHA-256: `7465c12a92f62749252a26e0cc4e083be352f76e8deb35fe6e9115ad01ded03d`. Both films remain exactly 90.000 seconds, 1920 × 1080, 30 FPS and 2,700 frames. The final assembly log contains no timestamp or decoding warnings.
