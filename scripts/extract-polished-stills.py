#!/usr/bin/env python3
"""Extract authentic closing-grid stills without changing baseline stills or site cards."""
from pathlib import Path
import json,subprocess,shutil
ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'assets/stills/polished';out.mkdir(parents=True,exist_ok=True)
shots={
 'block':('assets/footage/polished/block.mp4',4.6),
 'chromatic':('assets/footage/polished/chromatic.mp4',7.6),
 'rally':('assets/footage/revision/rally.mp4',5),
 'orb':('assets/footage/revision/orb-native.mp4',7),
 'float':('assets/footage/polished/float.mp4',6),
 'serpent':('assets/footage/polished/serpent.mp4',6),
 'brika':('assets/footage/polished/brika.mp4',8),
 'aim':('assets/footage/revision/aimmoving.mp4',3),
}
for key,(source,time) in shots.items():
    assert (ROOT/source).is_file(),source
    target=out/f'{key}.jpg';assert not target.exists(),f'Refusing to overwrite {target}'
    subprocess.run(['ffmpeg','-v','error','-ss',str(time),'-i',str(ROOT/source),'-frames:v','1','-q:v','2',str(target)],check=True)
    # Separate raw copy lets canonical HyperFrames grading affect the backdrop
    # without touching the genuine, uncropped foreground image.
    shutil.copyfile(target,out/f'{key}-backdrop.jpg')
ledger={'purpose':'Authentic closing-grid stills; foreground pixels ungraded; backdrops receive canonical HyperFrames blur/exposure only.','shots':{k:{'source':s,'time':t} for k,(s,t) in shots.items()}}
(ROOT/'docs/provenance/polished-stills.json').write_text(json.dumps(ledger,indent=2)+'\n')
print('Extracted eight genuine gameplay stills and separate treatment backdrops.')
