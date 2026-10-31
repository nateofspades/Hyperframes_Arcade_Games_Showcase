#!/usr/bin/env python3
"""Extend only the two existing presentation padding strips from native footage.

No gameplay images are changed. The generated PNGs are backgrounds behind the
existing perimeter pseudo-elements, using the unchanged footage scale/position.
"""
from pathlib import Path
import subprocess
import cv2
import numpy as np

OUT = Path('assets/footage/final-three-2026-10-31')
OUT.mkdir(parents=True, exist_ok=True)

def frame(path, width, height):
    data = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', path,
        '-vf', f'scale={width}:{height}:flags=bilinear', '-frames:v', '1',
        '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-threads', '1', '-'])
    return np.frombuffer(data, np.uint8).reshape(height, width, 3)

# Rally's transparent dashboard inherits the game's body radial gradient.
# Continue that horizontal gradient upward, without external composition pixels
# or recreated text. Edge continuation retains the native HUD shading.
rally = frame('assets/footage/targeted-2026-10-30/rally.mp4', 956, 638)
# The tiny eyebrow labels touch the captured top row. A robust local median
# removes their sparse glyph pixels while retaining the slow native gradient.
padded = np.pad(rally[:3], ((0, 0), (20, 20), (0, 0)), mode='edge')
row = np.stack([np.median(padded[:, x:x+41], axis=(0, 1))
                for x in range(956)]).astype(np.uint8)
rally_strip = np.repeat(row[None], 12, axis=0)
assert cv2.imwrite(str(OUT / 'rally-hud-extension.png'), rally_strip)

# Aim has a flat paper HUD and native grid (32 logical px, first line at 20).
# Sample one grid period to the right of the negative-x extension. This carries
# every horizontal line at its original y, and the preceding vertical grid line
# at the correct x. The robust row median supplies paper and divider without
# copying SCORE glyphs or the original canvas's rounded left corner.
aim = frame('assets/footage/revision/aimpractice.mp4', 956, 636)
period = 32 * 956 / 1052
xx = (np.arange(16, dtype=np.float32) - 12 + period)
yy = np.arange(636, dtype=np.float32)
mx = np.repeat(xx[None, :], 636, axis=0)
my = np.repeat(yy[:, None], 16, axis=1)
strip = cv2.remap(aim, mx, my, cv2.INTER_LINEAR)
# Native canvas begins at y=96 of the 700px source (border included). Everything
# above its first filled row is paper/HUD/divider, not the grid.
canvas_top = 96 * 636 / 700
boundary_end = int(np.ceil(canvas_top))
strip[:boundary_end] = np.median(aim[:boundary_end], axis=1).astype(np.uint8)[:, None]
# SCORE starts at native x=0: never cover those original HUD pixels. Only the
# canvas section has an obsolete inner left border that needs to be extended.
strip = cv2.cvtColor(strip, cv2.COLOR_BGR2BGRA)
strip[:int(canvas_top)-3, 12:, 3] = 0
assert cv2.imwrite(str(OUT / 'aim-left-extension.png'), strip)
print('Created native-background-only extensions:', OUT)
