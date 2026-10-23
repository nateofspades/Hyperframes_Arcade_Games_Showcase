import { fileURLToPath as projectFilePath } from 'node:url';
import { dirname as projectDirname, resolve as projectResolve } from 'node:path';
const projectRoot = projectResolve(projectDirname(projectFilePath(import.meta.url)), '..');
// Genuine live canvas recording. Game RAF/physics own time; no staged state.
import {chromium} from 'playwright';import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {prepare} from './action-controls.mjs';
process.chdir(projectRoot);fs.mkdirSync('assets/footage',{recursive:true});fs.mkdirSync('evidence/capture',{recursive:true});
const map={rally:'Rally_Reactor_Game',orb:'Orb_Onslaught_Game',brika:'BrikaVolt_Game',aimpractice:'Aim_Alley_Arcade_Game',aimmoving:'Aim_Alley_Arcade_Game',aimprecision:'Aim_Alley_Arcade_Game',block:'4_Block_Theory_Game',chromatic:'Chromatic_Cure_Game',float:'Float_Tweet_Bounce_Game',serpent:'Serpent_Supper_Game'};
const browser=await chromium.launch({executablePath:process.env.ARCADE_CHROME_PATH || chromium.executablePath(),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--mute-audio']});
const failures=[];
try{for(const key of process.argv.slice(2)){
 const page=await browser.newPage({viewport:{width:1600,height:1200},deviceScaleFactor:1});const url=`https://nateofspades.github.io/${map[key]}/`+(key.startsWith('aim')?'?test=1':'');
 try{const r=await page.goto(url);if(r.status()!==200)throw Error('HTTP '+r.status());await page.waitForTimeout(350);const ctl=await prepare(page,key);await page.evaluate(()=>document.activeElement?.blur());if(key==='brika')await page.keyboard.press('Space');
 if(ctl.warmupMs)await page.waitForTimeout(ctl.warmupMs);
 const seconds=key==='brika'?35:key==='rally'?18:key==='orb'?17:key.startsWith('aim')?6:18;
 const dimensions=await page.locator(ctl.selector).first().evaluate(c=>({width:c.width,height:c.height}));
 await page.locator(ctl.selector).first().evaluate(c=>{window.recChunks=[];const stream=c.captureStream(30);window.captureRecorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:6000000});window.captureRecorder.ondataavailable=e=>{if(e.data.size)window.recChunks.push(e.data);};window.captureRecorder.start(1000);});
 console.log('RECORDING',key,seconds,dimensions);const start=Date.now();let log=-1;const states=[];let controlError=null;
 while(Date.now()-start<seconds*1000){const time=(Date.now()-start)/1000;try{await ctl.tick(Math.floor(time*30));}catch(e){controlError=String(e);console.error('CONTROL',key,controlError);break;}if(Math.floor(time)>log){log=Math.floor(time);const state=await ctl.state();states.push({time,state});console.log(key,time.toFixed(2),JSON.stringify(state).slice(0,250));}await page.waitForTimeout(25);}
 const data=await page.evaluate(async()=>{await new Promise(resolve=>{window.captureRecorder.onstop=resolve;window.captureRecorder.stop();});const blob=new Blob(window.recChunks,{type:'video/webm'});return await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(blob);});});
 fs.writeFileSync(`assets/footage/${key}-original.webm`,Buffer.from(data,'base64'));
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',`assets/footage/${key}-original.webm`,'-vf','fps=30,pad=ceil(iw/2)*2:ceil(ih/2)*2','-an','-c:v','libx264','-threads','1','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',`assets/footage/${key}.mp4`]);
 fs.writeFileSync(`evidence/capture/${key}.json`,JSON.stringify({key,url,dimensions,requestedFps:30,seconds,controlError,method:'Live native canvas.captureStream / MediaRecorder; original game RAF; real keyboard/pointer controls; state read-only',states},null,2));
 const duration=JSON.parse(execFileSync('ffprobe',['-v','quiet','-show_format','-of','json',`assets/footage/${key}.mp4`],{encoding:'utf8'})).format.duration;console.log('SAVED',key,duration);if(controlError)failures.push({key,error:controlError});
 }catch(e){console.error('FAILED',key,e.stack);failures.push({key,error:String(e)});}finally{await page.close();}
 }}finally{await browser.close();fs.writeFileSync('evidence/capture/failures.json',JSON.stringify(failures,null,2));}if(failures.length)process.exitCode=1;
