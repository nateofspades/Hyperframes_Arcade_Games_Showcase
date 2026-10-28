// Revision capture: real public games, read-only observations and paced real inputs.
// No game-state mutation, synthetic HUD, speed-up, or replacement renderer.
import {chromium} from 'playwright';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {startGame,readState,planBlock} from './puzzle-controls.mjs';
process.chdir(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
const repos={block:'4_Block_Theory_Game',chromatic:'Chromatic_Cure_Game',rally:'Rally_Reactor_Game',orb:'Orb_Onslaught_Game',aimpractice:'Aim_Alley_Arcade_Game',aimmoving:'Aim_Alley_Arcade_Game',aimprecision:'Aim_Alley_Arcade_Game'};
const out='assets/footage/revision'; fs.mkdirSync(out,{recursive:true});fs.mkdirSync('evidence/revision',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.ARCADE_CHROME_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--mute-audio']});
async function union(page,selectors){return page.evaluate(selectors=>{const rs=selectors.map(s=>document.querySelector(s).getBoundingClientRect());const x=Math.floor(Math.min(...rs.map(r=>r.x))),y=Math.floor(Math.min(...rs.map(r=>r.y)));return {x,y,width:Math.ceil(Math.max(...rs.map(r=>r.right)))-x,height:Math.ceil(Math.max(...rs.map(r=>r.bottom)))-y};},selectors);}
try{for(const key of process.argv.slice(2)){
 if(!repos[key])throw Error('Unknown game '+key);
 const target=key.startsWith('aim')?`evidence/revision/${key}-pointerless.mp4`:`${out}/${key}.mp4`;if(fs.existsSync(target))throw Error('Refusing to overwrite '+target);
 const page=await browser.newPage({viewport:{width:1600,height:1200},deviceScaleFactor:1});
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
 const url=`https://nateofspades.github.io/${repos[key]}/`+(key.startsWith('aim')?'?test=1':'');
 const response=await page.goto(url);if(response.status()!==200)throw Error('HTTP '+response.status());await page.clock.runFor(150);
 let selectors,read,tick; const actions=[],pointer=[];
 const press=async(f,k)=>{actions.push({frame:f,key:k});await page.keyboard.press(k);};
 if(key==='block'){
  await startGame(page,key);read=()=>readState(page,key);
  // Only hide existing controls, without changing board/HUD geometry or values.
  await page.addStyleTag({content:'.touch-controls,.previews button,.previews .keys{visibility:hidden!important}'});
  selectors=['.stats','#board','.preview'];
  let queue=[],next=10,signature='';
  tick=async f=>{
   const s=await read();if(s.state!=='playing')throw Error('Block stopped');
   const id=JSON.stringify(s.board)+s.active.type;
   if(id!==signature){signature=id;queue=[];const p=planBlock(s);if(!p)return;
    const r=(p.rotation-s.active.rotation+4)%4;
    queue.push(...Array(r).fill('ArrowUp'));
    queue.push(...Array(Math.abs(p.x-s.active.x)).fill(p.x<s.active.x?'ArrowLeft':'ArrowRight'));
    next=f+10;
   }
   if(f<next)return;
   const k=queue.length?queue.shift():'ArrowDown';await press(f,k);
   next=f+(k==='ArrowUp'?7:k==='ArrowDown'?4:5);
  };
 }else if(key==='chromatic'){
  await startGame(page,key);read=()=>readState(page,key);
  await page.addStyleTag({content:'aside .actions,aside .controls,aside .audio-controls,aside details,aside button,aside input,aside label{visibility:hidden!important}'});
  selectors=['.lattice-area','.stats','.preview'];
  // Modest, deliberate placements. Natural gravity between brief soft-drop holds.
  const schedule=new Map([[12,'ArrowLeft'],[23,'ArrowUp'],[48,'ArrowLeft'],[125,'ArrowRight'],[137,'ArrowRight'],[150,'ArrowUp'],[230,'ArrowLeft'],[245,'ArrowUp'],[325,'ArrowRight']]);
  tick=async f=>{if(schedule.has(f))await press(f,schedule.get(f));if(f%100>=55&&f%100<=88&&f%4===0)await press(f,'ArrowDown');};
 }else if(key==='rally'){
  await page.selectOption('#difficulty','medium');await page.locator('#start').click({force:true});await page.clock.runFor(1600);
  selectors=['.dashboard','#court'];read=()=>page.evaluate(()=>window.vectorDuel.state());let last='';
  tick=async f=>{if(f%7)return;const s=await read();const d=s.ball.y+18*Math.sin(f/43)-s.paddles[0];const k=Math.abs(d)<28?'':d>0?'ArrowDown':'ArrowUp';if(k!==last){if(last)await page.keyboard.up(last);if(k)await page.keyboard.down(k);last=k;actions.push({frame:f,key:k});}};
 }else if(key==='orb'){
  await page.evaluate(async()=>{window.captureRead=await import(new URL('src/app.js',location.href).href);});await page.locator('#primary').click({force:true});
  selectors=['.hud','canvas'];read=()=>page.evaluate(()=>{const g=window.captureRead.game;return {state:g.state,score:g.score,lives:g.lives,balls:g.balls,player:g.player};});
  let held='';
  tick=async f=>{if(f%26===10){await page.keyboard.down('Space');actions.push({frame:f,key:'Space'});}if(f%26===13)await page.keyboard.up('Space');
   // Short walking bursts separated by pauses, rather than continuous zigzagging.
   const phase=f%150;const k=phase<18?'ArrowRight':phase>=80&&phase<101?'ArrowLeft':'';
   if(k!==held){if(held)await page.keyboard.up(held);if(k)await page.keyboard.down(k);held=k;actions.push({frame:f,key:k});}
  };
 }else{
  await page.locator('#enter').click({force:true});const name={aimpractice:'Target Practice',aimmoving:'Moving Targets',aimprecision:'Precision Shooting'}[key];await page.getByRole('button',{name:new RegExp(name)}).click({force:true});await page.locator('#start').click({force:true});
  await page.addStyleTag({content:'.game-tip{visibility:hidden!important}'});
  selectors=['.hud','#game-canvas'];read=()=>page.evaluate(()=>window.__arcade.snapshot());
  let pos={x:0.5,y:0.5},goal=null,nextShot=25;
  tick=async f=>{const s=await read();const box=await page.locator('#game-canvas').boundingBox();
   if((!goal||f%6===0)&&s.targets[0])goal={x:s.targets[0].x/s.width,y:s.targets[0].y/s.height};
   if(goal){const dx=goal.x-pos.x,dy=goal.y-pos.y;const dist=Math.hypot(dx,dy),step=Math.min(.23,0.019/Math.max(.001,dist));pos.x+=dx*step;pos.y+=dy*step;}
   await page.mouse.move(box.x+pos.x*box.width,box.y+pos.y*box.height);
   pointer.push({frame:f,x:box.x+pos.x*box.width,y:box.y+pos.y*box.height});
   if(f>=nextShot&&goal&&Math.hypot(goal.x-pos.x,goal.y-pos.y)<.018){await page.mouse.down();await page.mouse.up();actions.push({frame:f,key:'click',position:{...pos}});goal=null;nextShot=f+24+(actions.length%3)*4;}
  };
 }
 await page.evaluate(()=>document.activeElement?.blur());await page.clock.runFor(100);
 const clip=await union(page,selectors);const seconds=key.startsWith('aim')?8:13;
 const cdp=await page.context().newCDPSession(page);
 let hudFingerprint='';
 const enc=spawn('ffmpeg',['-hide_banner','-loglevel','error','-n','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-an','-c:v','libx264','-threads','1','-preset','fast','-crf','17','-g','30','-keyint_min','30','-sc_threshold','0','-pix_fmt','yuv420p','-movflags','+faststart',target]);enc.stderr.on('data',d=>process.stderr.write(d));
 const states=[];console.log('CAPTURING',key,clip);
 try{for(let f=0;f<seconds*30;f++){
  const t0=performance.now();await tick(f);const t1=performance.now();await page.clock.runFor(Math.round((f+1)*1000/30)-Math.round(f*1000/30));const t2=performance.now();
  // Capture authentic DOM pixels when the real HUD changes, then copy each live
  // game canvas at every 30 Hz step. This avoids repainting unchanged page chrome
  // on the limited VPS. No HUD text is recreated, and no game state is modified.
  const fingerprint=await page.evaluate(()=>[...document.querySelectorAll('.hud,.stats,.dashboard,#overlay')].map(e=>`${e.hidden}:${e.textContent}`).join('|'));
  let base=null;
  if(f===0||fingerprint!==hudFingerprint){
   const shot=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:94,clip:{...clip,scale:1},captureBeyondViewport:true});
   base=shot.data;hudFingerprint=fingerprint;
  }
  const pixels=await page.evaluate(async({base,clip})=>{
   if(base){const image=new Image();image.src='data:image/jpeg;base64,'+base;await image.decode();window.__captureBackdrop=image;}
   const c=window.__captureOutput||(window.__captureOutput=document.createElement('canvas'));
   c.width=clip.width;c.height=clip.height;const ctx=c.getContext('2d');ctx.drawImage(window.__captureBackdrop,0,0);
   for(const source of document.querySelectorAll('canvas')){
    const r=source.getBoundingClientRect();if(r.width&&r.height&&r.x>=clip.x&&r.y>=clip.y&&r.right<=clip.x+clip.width+1&&r.bottom<=clip.y+clip.height+1)ctx.drawImage(source,r.x-clip.x,r.y-clip.y,r.width,r.height);
   }
   return c.toDataURL('image/jpeg',.94).split(',')[1];
  },{base,clip});
  const image=Buffer.from(pixels,'base64');if(!enc.stdin.write(image))await once(enc.stdin,'drain');
  if(f<4)console.log('TIMING',f,t1-t0,t2-t1,performance.now()-t2);
  if(f%30===0){states.push({frame:f,state:await read()});console.log(key,f/30);}
  if(f%90===0)fs.writeFileSync(`evidence/revision/${key}-${f}.jpg`,image);
 }}finally{enc.stdin.end();const [code]=await once(enc,'close');if(code!==0)throw Error('ffmpeg '+code);}
 fs.writeFileSync(`evidence/revision/${key}.json`,JSON.stringify({url,clip,fps:30,seconds,actions,pointer,states},null,2));await page.close();
}}finally{await browser.close();}
