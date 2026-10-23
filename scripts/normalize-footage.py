#!/usr/bin/env python3
"""Normalize captured MP4 GOPs for deterministic HyperFrames seeking; keep original takes."""
from pathlib import Path
import subprocess,json,hashlib
r=Path(__file__).resolve().parents[1]; out=r/'assets/footage'; backup=out/'original-takes';backup.mkdir(exist_ok=True)
keys=['block','chromatic','rally','orb','float','serpent','brika','aimpractice','aimmoving','aimprecision'];report=[]
for key in keys:
    p=out/f'{key}.mp4';original=backup/p.name
    if not original.exists():p.replace(original)
    temp=out/f'{key}.seek.mp4'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(original),'-an','-c:v','libx264','-threads','1','-preset','veryfast','-crf','16','-profile:v','high','-r','30','-g','30','-keyint_min','30','-sc_threshold','0','-pix_fmt','yuv420p','-movflags','+faststart',str(temp)],check=True)
    info=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_format','-show_streams','-of','json',str(temp)]));assert info['streams'][0]['avg_frame_rate']=='30/1'
    temp.replace(p)
    keyframes=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-skip_frame','nokey','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',str(p)]))['frames']
    ts=[float(f['best_effort_timestamp_time']) for f in keyframes];max_gap=max([b-a for a,b in zip(ts,ts[1:])]+[0]);assert max_gap<=1.001
    item={'key':key,'original':str(original.relative_to(r)),'normalized':str(p.relative_to(r)),'duration':info['format']['duration'],'fps':info['streams'][0]['avg_frame_rate'],'max_keyframe_gap_seconds':max_gap,'sha256':hashlib.file_digest(p.open('rb'),'sha256').hexdigest()};report.append(item);print(item,flush=True)
(r/'evidence/keyframe-normalization.json').write_text(json.dumps(report,indent=2))
