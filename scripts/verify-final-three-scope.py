#!/usr/bin/env python3
"""Compare the working tree to the preserved unpublished iteration, not HEAD.

Usage: python3 scripts/verify-final-three-scope.py BACKUP_DIRECTORY REPORT_JSON
"""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

backup = Path(sys.argv[1])
report_path = Path(sys.argv[2])
manifest = json.loads((backup / 'manifest.json').read_text())
allowed = {'compositions/chromatic.html', 'compositions/rally.html',
           'compositions/aim.html', 'docs/revision-media-manifest.json',
           'tests/test_targeted_scope.py'}
changed = []
for name, expected in manifest.items():
    path = Path(name)
    assert path.is_file(), ('Missing pre-existing file', name)
    if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
        assert name in allowed, ('Out-of-scope existing-file change', name)
        changed.append(name)

for game in ['chromatic', 'rally', 'aim']:
    name = f'compositions/{game}.html'
    old = (backup / 'source' / name).read_text()
    new = Path(name).read_text()
    for kind in ['styles', 'motion']:
        pattern = rf'<!-- game-segment:{kind}:start -->.*?<!-- game-segment:{kind}:end -->'
        assert re.search(pattern, old, re.S).group() == re.search(pattern, new, re.S).group()
    for cls in ['game-title', 'game-description']:
        pattern = rf'<[^>]+class="{cls}"[^>]*>.*?</[^>]+>'
        assert re.search(pattern, old, re.S).group() == re.search(pattern, new, re.S).group()
    if game != 'chromatic':
        assert re.findall(r'<video[^>]+>', old) == re.findall(r'<video[^>]+>', new)
    else:
        normalize = lambda s: re.sub(r' (?:src|data-media-start)="[^"]*"', '', s)
        assert normalize(old) == normalize(new), 'Chromatic change beyond footage source/trim'

assert Path('README.md').read_bytes() == (backup / 'source/README.md').read_bytes()
result = {'baseline': str(backup), 'existing_files_checked': len(manifest),
          'changed_existing_files': sorted(changed), 'protected_file_hashes_preserved': True,
          'external_titles_descriptions_styles_motion_identical': True,
          'rally_and_aim_original_video_tags_identical': True,
          'readme_existing_uncommitted_bytes_preserved': True,
          'git_head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()}
report_path.parent.mkdir(parents=True, exist_ok=True)
report_path.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
