import { fileURLToPath as projectFilePath } from 'node:url';
import { dirname as projectDirname, resolve as projectResolve } from 'node:path';
const projectRoot = projectResolve(projectDirname(projectFilePath(import.meta.url)), '..');
import fs from 'node:fs';import {execFileSync as run} from 'node:child_process';
process.chdir(projectRoot);fs.mkdirSync('assets/stills',{recursive:true});
const games=JSON.parse(fs.readFileSync('scenes.json'));const report=[];
for(const g of games){const key=g.id==='aim'?'aimmoving':g.id;const file=`assets/footage/${key}.mp4`;const probe=JSON.parse(run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));const v=probe.streams.find(s=>s.codec_type==='video');const duration=+probe.format.duration;if(duration<g.trim+g.dur&&g.id!=='aim')throw Error(`${key} too short: ${duration}`);run('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(g.id==='aim'?2:g.trim+3),'-i',file,'-frames:v','1','-q:v','2',`assets/stills/${g.id}.jpg`]);report.push({game:g.title,file,width:v.width,height:v.height,duration,fps:v.avg_frame_rate});}
fs.writeFileSync('evidence/source-probes.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
