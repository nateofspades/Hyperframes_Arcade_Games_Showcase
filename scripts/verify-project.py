#!/usr/bin/env python3
"""Verify manifest media hashes, local references and baseline metadata; not HTML identity."""
from pathlib import Path
import json,hashlib,re,subprocess
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'docs/media-manifest.json').read_text())
revision_manifest=root/'docs/revision-media-manifest.json'
if revision_manifest.exists():
    manifest['assets'].extend(json.loads(revision_manifest.read_text())['assets'])
for row in manifest['assets']:
    p=root/row['path'];assert p.is_file(),p
    assert p.stat().st_size==row['bytes'],p
    assert hashlib.sha256(p.read_bytes()).hexdigest()==row['sha256'],p
    assert p.stat().st_size<100*1024*1024,p
    if p.suffix in ['.mp4','.wav']:
        d=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-of','json',str(p)]));assert abs(float(d['format']['duration'])-row['duration_seconds'])<0.001,p
missing=[]
listed={row['path'] for row in manifest['assets']}
referenced_media=set()
for p in [root/'index.html',*(root/'compositions').rglob('*.html')]:
    for rel in re.findall(r'(?:src|data-composition-src)=[\"\']([^\"\']+)',p.read_text()):
        if not re.match(r'(?:https?:|data:|#)',rel):
            if not (root/rel).is_file():missing.append((str(p.relative_to(root)),rel))
            if Path(rel).suffix.lower() in {'.mp4','.wav','.jpg','.png','.webm'}:referenced_media.add(rel)
assert not missing,missing
assert referenced_media <= listed, f'Referenced media absent from checksum manifest: {sorted(referenced_media-listed)}'
scenes=json.loads((root/'scenes.json').read_text());assert len(scenes)==8
assert sum(g['dur'] for g in scenes)==78
assert 'data-duration="90"' in (root/'index.html').read_text()
print(f"PASS: {len(manifest['assets'])} source assets, eight game scenes, local composition/media references and 90-second baseline duration.")
print('Media checksums verified against the preserved baseline and any authorized revision manifest; update manifests deliberately after asset changes.')
