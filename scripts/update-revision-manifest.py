#!/usr/bin/env python3
"""Deliberately refresh checksums for authorized revision assets, not the baseline."""
from pathlib import Path
import json,hashlib,subprocess,shutil
ROOT=Path(__file__).resolve().parents[1]
ledger=ROOT/'docs/provenance/polished';ledger.mkdir(parents=True,exist_ok=True)
for key in ['block','chromatic','float','serpent','brika']:
    source=ROOT/f'evidence/polished/{key}.json'
    assert source.is_file(),f'Capture not finalized: {key}'
    data=json.loads(source.read_text());assert len(data['states'])==14 and data['fps']==30
    shutil.copyfile(source,ledger/f'{key}.json')
assets=[]
for directory in ['assets/cursors','assets/footage/revision','assets/footage/polished','assets/stills/polished']:
    for p in sorted((ROOT/directory).glob('*')):
        if p.suffix not in {'.mp4','.jpg','.png'}:continue
        assert 'partial' not in p.name
        row={'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'included_in_project':True,'provenance':'docs/FINAL_VISUAL_REVISION.md'}
        if p.suffix=='.mp4':
            probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
            row['duration_seconds']=float(probe['format']['duration'])
            row['streams']=[{k:s[k] for k in ['codec_type','codec_name','width','height','avg_frame_rate'] if k in s} for s in probe['streams']]
            assert all(s['codec_name']=='h264' and s['avg_frame_rate']=='30/1' for s in row['streams'])
            if '/polished/' in row['path']:assert row['duration_seconds']==14
        assets.append(row)
(ROOT/'docs/revision-media-manifest.json').write_text(json.dumps({'assets':assets},indent=2)+'\n')
print(f'Recorded {len(assets)} authorized revision assets and five finalized capture ledgers. Baseline manifest unchanged.')
