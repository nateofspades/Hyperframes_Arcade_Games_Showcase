#!/usr/bin/env python3
"""Require all requested authentic Chromatic behaviors in the selected 9 seconds."""
import json
from pathlib import Path
import subprocess
import cv2
import numpy as np

root = Path('evidence/final-three')
provenance = json.loads(Path('docs/provenance/final-three-2026-10-31/chromatic.json').read_text())
placements = [p for p in provenance['placements'] if 15 <= p['lockFrame'] <= 255]
vertical = [p for p in placements if p['target']['dir'] % 2]
horizontal = [p for p in placements if not p['target']['dir'] % 2]
assert len(vertical) >= 2, 'Need multiple visible vertical placements'
assert horizontal, 'Need a clearly visible horizontal placement'
assert not any(a['key'] == 'Space' for a in provenance['actions']), 'No instant hard drops'
matches = [m for m in provenance['matchEvidence'] if 15 <= m['frame'] <= 246]
assert matches, 'Need a visible four-cell vertical run before a native clear'
for match in matches:
    assert any(match['frame'] < change['frame'] <= match['frame']+12
               and change['anchors'] < 8 for change in provenance['scoreChanges']), match

source = 'assets/footage/final-three-2026-10-31/chromatic.mp4'
decoder = subprocess.Popen(['ffmpeg', '-v', 'error', '-threads', '1', '-i', source,
    '-pix_fmt', 'bgr24', '-threads', '1', '-f', 'rawvideo', '-'], stdout=subprocess.PIPE)
w, h = 316, 706
size = w*h*3
samples = sorted(set([0, 30, *[p['lockFrame'] for p in placements],
    *[m['frame']+k for m in matches for k in [-1, 0, 4, 8, 12]], 269]))
frames = {}
minimum_std = 999
for n in range(270):
    data = decoder.stdout.read(size)
    assert len(data) == size, ('Incomplete source frame', n)
    frame = np.frombuffer(data, np.uint8).reshape(h, w, 3)
    std = float(frame[75:, :, :].std())
    minimum_std = min(minimum_std, std)
    assert std > 12, ('Blank/blinking game board', n, std)
    if n in samples:
        frames[n] = frame.copy()
assert not decoder.stdout.read(1) and decoder.wait() == 0
for n, image in frames.items():
    cv2.imwrite(str(root / f'chromatic-decoded-{n:03}.png'), image)
# Four columns, labels occupy their own space rather than obscuring gameplay.
columns = 4
rows = (len(frames)+columns-1)//columns
sheet = np.full((rows*(h+32), columns*w, 3), 20, np.uint8)
for i, (n, image) in enumerate(frames.items()):
    y, x = (i//columns)*(h+32), (i%columns)*w
    sheet[y+32:y+32+h, x:x+w] = image
    cv2.putText(sheet, f'f{n} / video {14+n/30:.3f}s', (x+4, y+22),
                cv2.FONT_HERSHEY_SIMPLEX, .46, (245,245,245), 1, cv2.LINE_AA)
cv2.imwrite(str(root / 'chromatic-decoded-sequence.jpg'), sheet)
report = {'frames_scanned': 270, 'vertical_lock_frames': [p['lockFrame'] for p in vertical],
          'horizontal_lock_frames': [p['lockFrame'] for p in horizontal],
          'native_vertical_matches': matches,
          'native_score_changes': provenance['scoreChanges'],
          'hard_drop_inputs': 0, 'minimum_board_std': minimum_std,
          'decoded_review_frames': samples}
(root / 'chromatic-behavior-verification.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='native_vertical_matches'}, indent=2))
