#!/usr/bin/env python3
"""Verify actual delivered streams, decode representative frames and build contact sheet."""
import json, subprocess, pathlib, sys, hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
video=ROOT/(sys.argv[1] if len(sys.argv)>1 else 'Arcade_Games_Showcase.mp4')
evidence=ROOT/'evidence'; evidence.mkdir(exist_ok=True)
def run(args):return subprocess.run(args,check=True,capture_output=True,text=True)
probe=json.loads(run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(video)]).stdout)
v=next(x for x in probe['streams'] if x['codec_type']=='video');a=next(x for x in probe['streams'] if x['codec_type']=='audio')
assert v['codec_name']=='h264' and a['codec_name']=='aac',probe
assert (v['width'],v['height'])==(1920,1080),v
assert v['avg_frame_rate']=='30/1',v
assert 85<=float(probe['format']['duration'])<=95,probe
assert video.stat().st_size>1000000
probe['sha256']=hashlib.file_digest(video.open('rb'),'sha256').hexdigest()
games=json.loads((ROOT/'scenes.json').read_text())
for g in games:
    keys=['aimpractice','aimmoving','aimprecision'] if g['id']=='aim' else [g['id']]
    for key in keys:
        capture=json.loads((ROOT/'docs/provenance'/f'{key}.json').read_text())
        assert capture['fps']==30 and capture['states'],key
        assert (ROOT/'assets/footage'/f'{key}.mp4').stat().st_size>10000,key
probe['verified_game_titles']=[g['title'] for g in games]
probe['source_capture_count']=len({g['title'] for g in games})
assert probe['source_capture_count']==8
(evidence/('final-probe.json' if video.name=='Arcade_Games_Showcase.mp4' else 'draft-probe.json')).write_text(json.dumps(probe,indent=2))
frames=ROOT/('final-frames' if video.name=='Arcade_Games_Showcase.mp4' else 'draft-frames');frames.mkdir(exist_ok=True)
samples=[(3,'Opening'),(9,'4 Block Theory'),(18,'Chromatic Cure'),(27,'Rally Reactor'),(36,'Orb Onslaught'),(45,'Float Tweet Bounce'),(54,'Serpent Supper'),(63,'BrikaVolt'),(70,'Aim Alley - Target Practice'),(76,'Aim Alley - Moving Targets'),(81,'Aim Alley - Precision'),(86,'Ending')]
for i,(t,title) in enumerate(samples):
 run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(t),'-i',str(video),'-frames:v','1','-q:v','2',str(frames/f'{i:02d}-{t}s.jpg')])
run(['ffmpeg','-hide_banner','-loglevel','error','-y','-framerate','1','-pattern_type','glob','-i',str(frames/'*.jpg'),'-vf','scale=480:270,tile=4x3:padding=6:margin=6:color=0x080e1c','-frames:v','1','-q:v','2',str(ROOT/('Arcade_Showcase_Contact_Sheet.jpg' if video.name=='Arcade_Games_Showcase.mp4' else 'Draft_Contact_Sheet.jpg'))])
black=run(['ffmpeg','-hide_banner','-threads','1','-i',str(video),'-vf','blackdetect=d=0.2:pix_th=0.03','-an','-f','null','-'])
(evidence/('final-blackdetect.txt' if video.name=='Arcade_Games_Showcase.mp4' else 'draft-blackdetect.txt')).write_text(black.stderr)
print(json.dumps({'file':str(video),'duration':probe['format']['duration'],'width':v['width'],'height':v['height'],'fps':v['avg_frame_rate'],'video':v['codec_name'],'audio':a['codec_name'],'size_bytes':video.stat().st_size,'sha256':probe['sha256'],'frames':str(frames)},indent=2))
