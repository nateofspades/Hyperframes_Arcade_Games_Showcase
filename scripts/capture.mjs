import { fileURLToPath as projectFilePath } from 'node:url';
import { dirname as projectDirname, resolve as projectResolve } from 'node:path';
const projectRoot = projectResolve(projectDirname(projectFilePath(import.meta.url)), '..');
import {chromium} from 'playwright';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const root=projectRoot;process.chdir(root);
fs.mkdirSync('assets/footage',{recursive:true});fs.mkdirSync('evidence/capture',{recursive:true});
const executablePath=process.env.ARCADE_CHROME_PATH || chromium.executablePath();
const map={rally:'Rally_Reactor_Game',orb:'Orb_Onslaught_Game',brika:'BrikaVolt_Game',aimpractice:'Aim_Alley_Arcade_Game',aimmoving:'Aim_Alley_Arcade_Game',aimprecision:'Aim_Alley_Arcade_Game',block:'4_Block_Theory_Game',chromatic:'Chromatic_Cure_Game',float:'Float_Tweet_Bounce_Game',serpent:'Serpent_Supper_Game'};
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--mute-audio']});
async function prepare(page,key){
 if(['block','chromatic','float','serpent'].includes(key)){return (await import('./puzzle-controls.mjs')).prepare(page,key);}
 if(key==='rally'){
 await page.selectOption('#difficulty','hard');await page.locator('#start').click({force:true});await page.clock.runFor(1600);let last='';
 return {selector:'#court',state:()=>page.evaluate(()=>window.vectorDuel.state()),tick:async f=>{const s=await page.evaluate(()=>window.vectorDuel.state());const d=s.ball.y+22*Math.sin(f/40)-s.paddles[0];const k=Math.abs(d)<9?'':d>0?'ArrowDown':'ArrowUp';if(k!==last){if(last)await page.keyboard.up(last);if(k)await page.keyboard.down(k);last=k;}}};
 }
 if(key==='brika'){
 await page.locator('#primary').click({force:true});await page.keyboard.press('Space');
 return {selector:'#game',state:()=>page.evaluate(()=>window.prismState()),tick:async f=>{const s=await page.evaluate(()=>window.prismState());if(s.mode==='ready')await page.keyboard.press('Space');const b=s.balls.filter(b=>b.vy>0).sort((a,b)=>b.y-a.y)[0]||s.balls[0];if(b){const r=await page.locator('#game').boundingBox();await page.mouse.move(r.x+r.width*Math.max(.04,Math.min(.96,(b.x+12*Math.sin(f/90))/720)),r.y+r.height*.9);}}};
 }
 if(key==='orb'){
 await page.evaluate(async()=>{window.captureRead=await import(new URL('src/app.js',location.href).href);});await page.locator('#primary').click({force:true});await page.keyboard.down('Space');let last='';
 return {selector:'canvas',state:()=>page.evaluate(()=>{const g=window.captureRead.game;return {state:g.state,score:g.score,lives:g.lives,balls:g.balls,player:g.player};}),tick:async f=>{const s=await page.evaluate(()=>{const g=window.captureRead.game;return {state:g.state,balls:g.balls,player:g.player};});if(s.state==='cleared'){await page.locator('#primary').click({force:true});await page.keyboard.down('Space');}let x=420+140*Math.sin(f/100);const danger=s.balls.filter(b=>b.y>270&&Math.abs(b.x-s.player.x)<b.r+65).sort((a,b)=>b.y-a.y)[0];if(danger)x=s.player.x+(danger.x>s.player.x?-110:110);const d=x-s.player.x;const k=Math.abs(d)<12?'':d>0?'ArrowRight':'ArrowLeft';if(k!==last){if(last)await page.keyboard.up(last);if(k)await page.keyboard.down(k);last=k;}}};
 }
 if(key.startsWith('aim')){
 await page.locator('#enter').click({force:true});const name={aimpractice:'Target Practice',aimmoving:'Moving Targets',aimprecision:'Precision Shooting'}[key];await page.getByRole('button',{name:new RegExp(name)}).click({force:true});await page.locator('#start').click({force:true});
 return {selector:'#game-canvas',state:()=>page.evaluate(()=>window.__arcade.snapshot()),tick:async f=>{if(f%(key==='aimpractice'?12:24)!==0)return;const s=await page.evaluate(()=>window.__arcade.snapshot());if(s.status!=='playing')return;const t=s.targets[0];if(t){const r=await page.locator('#game-canvas').boundingBox();await page.mouse.click(r.x+t.x*r.width/s.width,r.y+t.y*r.height/s.height);}}};
 }
}
try{for(const key of process.argv.slice(2)){
 const page=await browser.newPage({viewport:{width:1600,height:1200},deviceScaleFactor:1});
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
 const url=`https://nateofspades.github.io/${map[key]}/`+(key.startsWith('aim')?'?test=1':'');const response=await page.goto(url);if(response.status()!==200)throw Error('HTTP '+response.status());await page.clock.runFor(150);const c=await prepare(page,key);await page.evaluate(()=>document.activeElement?.blur());if(key==='brika')await page.keyboard.press('Space');if(c.warmupMs)await page.clock.runFor(c.warmupMs);await page.clock.runFor(100);
 const box=await page.locator(c.selector).first().boundingBox();const clip={x:Math.ceil(box.x),y:Math.ceil(box.y),width:Math.floor(box.width)-1,height:Math.floor(box.height)-1};
 const seconds=key==='brika'?26:key==='rally'?14:key==='orb'?12:key.startsWith('aim')?6:13;const states=[];
 const cdp=await page.context().newCDPSession(page);
 const enc=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-an','-c:v','libx264','-threads','1','-preset','fast','-crf','18','-g','30','-keyint_min','30','-sc_threshold','0','-pix_fmt','yuv420p','-movflags','+faststart',`assets/footage/${key}.mp4`]);enc.stderr.on('data',d=>process.stderr.write(d));
 console.log('CAPTURING',key,clip,seconds,'seconds');
 try{for(let f=0;f<seconds*30;f++){
 const ts=performance.now();await c.tick(f);const t1=performance.now();await page.clock.runFor(Math.round((f+1)*1000/30)-Math.round(f*1000/30));const t2=performance.now();
 const image=Buffer.from(await page.locator(c.selector).first().evaluate(canvas=>canvas.toDataURL('image/jpeg',.94).split(',')[1]),'base64');const t3=performance.now();if(!enc.stdin.write(image))await once(enc.stdin,'drain');if(f<5)console.log('TIMING',f,[t1-ts,t2-t1,t3-t2,performance.now()-t3]);
 if(f%30===0){const s=await c.state();states.push({time:f/30,state:s});console.log(key,f/30,JSON.stringify(s).slice(0,230));if(f%120===0)await page.screenshot({path:`evidence/capture/${key}-${f}.png`,clip});}
 } }finally{enc.stdin.end();await once(enc,'close');}
 fs.writeFileSync(`evidence/capture/${key}.json`,JSON.stringify({url,clip,fps:30,seconds,states},null,2));await page.close();console.log('SAVED',key);
 }}finally{await browser.close();}
