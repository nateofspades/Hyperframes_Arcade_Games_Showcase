#!/usr/bin/env python3
"""Render two seconds from the preserved Block scene without editing master source."""
from pathlib import Path
import re,json,subprocess,os,hashlib
root=Path(__file__).resolve().parents[1];work=root/'.validation';work.mkdir(exist_ok=True)
for name in ['assets','compositions']:
    p=work/name
    if not p.exists():p.symlink_to(root/name,target_is_directory=True)
master=(root/'index.html').read_text();before=hashlib.sha256(master.encode()).hexdigest()
block=re.search(r'<div\b[^>]*\bid="block"[^>]*></div>',master).group(0)
block=block.replace('data-start="5"','data-start="0"').replace('data-duration="9"','data-duration="2"')
html='<!doctype html><html><head><script src="assets/gsap.min.js"></script><style>*{box-sizing:border-box;margin:0}html,body{width:1920px;height:1080px;overflow:hidden;background:#080e1c}.clip{position:absolute;inset:0}</style></head><body><div id="root" data-composition-id="smoke" data-start="0" data-duration="2" data-width="1920" data-height="1080">'+block+'</div><script>window.__timelines=window.__timelines||{};window.__timelines.smoke=gsap.timeline({paused:true}).to({},{duration:2});</script></body></html>'
(work/'index.html').write_text(html)
output=work/'smoke.mp4'
assert not output.exists(),'Remove/rename the old local smoke render explicitly before running another test.'
cmd=['npx','--yes','hyperframes@0.8.186','render',str(work),'--workers','1','--fps','5','--quality','draft','--video-frame-format','png','--no-low-memory-mode','--no-best-effort','--browser-timeout','120','--protocol-timeout','300000','--player-ready-timeout','120000','--output',str(output)]
with (work/'render.log').open('w') as log:subprocess.run(cmd,cwd=root,env={**os.environ,'HYPERFRAMES_NO_TELEMETRY':'1'},stdout=log,stderr=subprocess.STDOUT,check=True)
d=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(output)]));v=next(s for s in d['streams'] if s['codec_type']=='video')
assert (v['width'],v['height'])==(1920,1080) and v['avg_frame_rate']=='5/1' and int(v['nb_frames'])==10 and abs(float(d['format']['duration'])-2)<0.01,d
subprocess.run(['ffmpeg','-v','error','-y','-ss','1','-i',str(output),'-frames:v','1',str(work/'smoke-frame.jpg')],check=True)
assert hashlib.sha256((root/'index.html').read_bytes()).hexdigest()==before
(work/'probe.json').write_text(json.dumps(d,indent=2));print('PASS: actual 2-second HyperFrames render, 1920x1080, 5 FPS, 10 decoded frames; master unchanged. Output:',output)
