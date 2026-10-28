#!/usr/bin/env python3
"""Bake canonical HyperFrames backdrop effects once; never alter foreground stills."""
from pathlib import Path
import subprocess,json,datetime
ROOT=Path(__file__).resolve().parents[1]
work=ROOT/'.validation/closing-backdrop-bake';work.mkdir(parents=True,exist_ok=True)
if not (work/'assets').exists():(work/'assets').symlink_to(ROOT/'assets',target_is_directory=True)
keys=['block','chromatic','rally','orb','float','serpent','brika','aim']
duration=str(1/30)
images='\n'.join(f'<img id="backdrop-{key}" class="bake-backdrop clip" src="assets/stills/polished/{key}.jpg" data-start="0" data-duration="{duration}" style="left:{(i%4)*388}px;top:{(i//4)*213}px">' for i,key in enumerate(keys))
html=f'''<!doctype html><html><head><script src="assets/gsap.min.js"></script><style>*{{box-sizing:border-box;margin:0}}html,body{{width:1920px;height:1080px;overflow:hidden;background:#080e1c}}.bake-backdrop{{position:absolute;width:388px;height:213px;object-fit:cover}}</style></head><body><div id="root" data-composition-id="backdrop-bake" data-start="0" data-duration="{duration}" data-width="1920" data-height="1080">{images}</div><script>window.__timelines={{}};window.__timelines['backdrop-bake']=gsap.timeline({{paused:true}}).to({{}},{{duration:{duration}}});</script></body></html>'''
(work/'index.html').write_text(html)
grading={'adjust':{'exposure':-2},'effects':{'blur':0.45}}
cli=['npx','--offline','--yes','hyperframes@0.8.186']
subprocess.run([*cli,'media-treatment','--project',str(work),'--selector','.bake-backdrop','--grading',json.dumps(grading),'--apply','--json'],cwd=ROOT,check=True)
output=work/('frames-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
subprocess.run([*cli,'render',str(work),'--format','png-sequence','--workers','1','--fps','30','--quality','delivery','--video-frame-format','png','--no-low-memory-mode','--browser-timeout','120','--protocol-timeout','600000','--player-ready-timeout','300000','--no-best-effort','--output',str(output)],cwd=ROOT,check=True)
frames=sorted(output.rglob('*.png'));assert len(frames)==1,frames
for i,key in enumerate(keys):
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(frames[0]),'-vf',f'crop=388:213:{(i%4)*388}:{(i//4)*213}','-frames:v','1','-q:v','2',str(ROOT/f'assets/stills/polished/{key}-backdrop.jpg')],check=True)
subprocess.run([*cli,'media-treatment','--file','compositions/outro.html','--selector','.tile-backdrop','--clear','--json'],cwd=ROOT,check=True)
(ROOT/'docs/provenance/closing-backdrop-treatment.json').write_text(json.dumps({'method':'One-frame HyperFrames PNG-sequence bake of canonical media-treatment; foreground gameplay unchanged','grading':grading,'tile_size':[388,213],'sources':{k:f'assets/stills/polished/{k}.jpg' for k in keys}},indent=2)+'\n')
print('PASS: eight canonical HyperFrames-treated static backdrops baked; no live closing shader passes remain.')
