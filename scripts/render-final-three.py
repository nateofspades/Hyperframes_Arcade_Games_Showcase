#!/usr/bin/env python3
"""Local-only refinement of the exact unpublished master using existing render helpers.

Run after source checks, HyperFrames snapshots and decoded gameplay approval.
Uses the existing selective HyperFrames-snapshot/YUV workflow, not a wholesale
rerender of approved footage. No Git, network publication or release operations.
Optional NumPy/OpenCV environment is required by the existing compositor.
"""
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
config = root / 'docs/final-three-render.json'
cfg = json.loads(config.read_text())
baseline = root / cfg['baseline_path']
stamp = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H-%M-%SZ')
prefix = root / 'renders' / f'Arcade_Games_Showcase-final-three-{stamp}'
offline = prefix.with_name(prefix.name + '-offline').with_suffix('.mp4')
remux = prefix.with_name(prefix.name + '-offline-audio').with_suffix('.mp4')
final = prefix.with_suffix('.mp4')
evidence = root / 'evidence/final-three'
evidence.mkdir(parents=True, exist_ok=True)
assert not any(p.exists() for p in [offline, remux, final])

def run(args):
    print('RUN', ' '.join(map(str, args)), flush=True)
    subprocess.run(list(map(str, args)), cwd=root, check=True)

run([sys.executable, 'scripts/compose-targeted-video.py', baseline, config, offline])
run(['ffmpeg', '-v', 'error', '-n', '-i', offline, '-i', baseline,
     '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-movflags', '+faststart', remux])
run([sys.executable, 'scripts/export-compatible-video.py', remux, final])
run([sys.executable, 'scripts/verify-targeted-video.py', baseline, offline,
     final, config, evidence / 'verification.json'])
run([sys.executable, 'scripts/verify-final-three-scope.py',
     cfg['backup_directory'], evidence / 'source-scope.json'])
result = {'baseline': str(baseline), 'offline': str(offline), 'remux': str(remux),
          'final': str(final), 'status': 'export and automated all-frame verification passed; final visual/browser review separate'}
(evidence / 'render-result.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2), flush=True)
