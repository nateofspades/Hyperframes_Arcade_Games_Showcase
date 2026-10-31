// Targeted genuine gameplay recapture. Native engines/renderers; input events only.
// RAF timestamps advance exactly at 60 Hz, avoiding Playwright's 16 ms RAF cadence
// (which otherwise produces a periodic 48 ms step in a 30 FPS recording).
import {chromium} from 'playwright';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {startGame,readState,shouldFlap} from './puzzle-controls.mjs';
const dir='assets/footage/targeted-2026-10-30';fs.mkdirSync(dir,{recursive:true});
const evidence='evidence/targeted';fs.mkdirSync(evidence,{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage','--mute-audio']});
const repos={chromatic:'Chromatic_Cure',brika:'BrikaVolt',rally:'Rally_Reactor',float:'Float_Tweet_Bounce'};
try{for(const key of process.argv.slice(2)){
 const output=`${dir}/${key}.mp4`;if(fs.existsSync(output))throw Error('Refuse overwrite '+output);
 const p=await browser.newPage({viewport:{width:1600,height:key==='brika'?1200:1300}});
 await p.clock.install({time:new Date('2026-01-01T00:00:00Z')});await p.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
 await p.addInitScript(()=>{
  let now=0,id=0,queue=new Map();
  performance.now=()=>now;
  window.requestAnimationFrame=cb=>{queue.set(++id,cb);return id};
  window.cancelAnimationFrame=id=>queue.delete(id);
  window.__captureRaf=()=>{now+=1000/60;const pending=queue;queue=new Map();for(const cb of pending.values())cb(now)};
 });
 const url=`https://nateofspades.github.io/${repos[key]}_Game/`;
 const response=await p.goto(url);if(response.status()!==200)throw Error('HTTP '+response.status());
 await p.evaluate(()=>document.fonts.ready);await p.clock.runFor(150);
 const advance=async f=>{await p.clock.runFor(Math.round((f+1)*1000/30)-Math.round(f*1000/30));await p.evaluate(()=>{__captureRaf();__captureRaf()})};
 const actions=[],states=[];const press=async(f,k)=>{actions.push({frame:f,key:k});await p.keyboard.press(k)};
 let selectors,read,tick;
 if(key==='chromatic'){
  await startGame(p,key);read=()=>readState(p,key);selectors=['.stats','#board'];
  await p.addStyleTag({content:'.lattice-label,.lattice-foot,.preview,.session,.thumbs,.music,.how{visibility:hidden!important}.stats{display:flex!important;align-items:center!important;justify-content:space-around!important;padding:8px!important;gap:6px!important}.stats .numbers{display:contents!important}.stats .numbers>div,.stats .level-stat,.stats .anchor-stat{display:flex!important;flex-direction:column!important;border:0!important;margin:0!important;padding:0!important;gap:3px!important}.stats strong{font-size:23px!important}.stats span{font-size:9px!important}.channel-icon,#chain{display:none!important}'});
  await p.evaluate(()=>{const b=document.querySelector('#board').getBoundingClientRect(),s=document.querySelector('.stats');Object.assign(s.style,{position:'fixed',left:b.x+'px',top:(b.y-74)+'px',width:b.width+'px',height:'74px',zIndex:'9',boxSizing:'border-box'})});
  // Build genuine stacks with ordinary placements, not fixtures/state mutation.
  let piece=0,queue=[],next=0,signature='';
  tick=async(f,warm)=>{const s=await read();if(s.overlay)throw Error('Chromatic stopped');
   const sig=s.active?JSON.stringify(s.board)+s.active.colors.join(','):null;
   if(sig&&sig!==signature){signature=sig;const cols=[0,6,1,5,0,6,2,5,0,6,1,4,2,6];const x=cols[piece++%cols.length];queue=['ArrowUp',...Array(Math.abs(x-s.active.x)).fill(x<s.active.x?'ArrowLeft':'ArrowRight')];next=f+3;}
   if(f<next)return;await press(f,queue.length?queue.shift():warm?'Space':'ArrowDown');next=f+(warm?3:5);
  };
 }else if(key==='float'){
  await startGame(p,key);read=()=>readState(p,key);selectors=['#game','.hud'];
  await p.addStyleTag({content:'.controls,.instructions{visibility:hidden!important}'});
  tick=async f=>{const s=await read();if(s.state==='gameover')throw Error('Float crashed');if(shouldFlap(s))await press(f,'Space')};
 }else if(key==='rally'){
  await p.selectOption('#difficulty','hard');await p.locator('#start').click({force:true});
  read=()=>p.evaluate(()=>window.vectorDuel.state());selectors=['.dashboard','#court'];let held='';
  tick=async f=>{const s=await read();const d=s.ball.y-s.paddles[0],k=Math.abs(d)<16?'':d>0?'ArrowDown':'ArrowUp';if(k!==held){if(held)await p.keyboard.up(held);if(k)await p.keyboard.down(k);held=k;actions.push({frame:f,key:k})}};
 }else if(key==='brika'){
  await p.addStyleTag({content:'.arena{width:800px!important;height:1000px!important;flex:none!important}'});await p.clock.runFor(150);
  await p.locator('#primary').click({force:true});await p.evaluate(()=>document.activeElement?.blur());await press(0,'Space');
  read=()=>p.evaluate(()=>window.prismState());selectors=['.hud','#game'];let motion=null,x=360,next=0;
  tick=async f=>{const s=await read();if(s.mode==='ready')await press(f,'Space');if(s.mode==='gameover')throw Error('Brika over');
   if(f>=next){const b=s.balls.filter(b=>b.vy>0).sort((a,b)=>b.y-a.y)[0]||s.balls[0];if(b){let target=b.x;if(b.vy>0){target+=b.vx*Math.max(0,(s.paddle.y-b.y)/b.vy);while(target<8||target>712)target=target<8?16-target:1424-target;}target=Math.max(58,Math.min(662,target+[ -21,13,0,24,-9][Math.floor(f/9)%5]));const duration=5+Math.min(8,Math.floor(Math.abs(target-x)/36));motion={start:f,end:f+duration,from:x,to:target};next=f+duration+4+(Math.floor(f/11)%5);actions.push({frame:f,pointerTarget:target,durationFrames:duration});}}
   if(motion){const t=Math.min(1,(f-motion.start)/(motion.end-motion.start));const ease=t*t*t*(10+t*(-15+6*t));x=motion.from+(motion.to-motion.from)*ease;const r=await p.locator('#game').boundingBox();await p.mouse.move(r.x+r.width*x/720,r.y+r.height*.9)}
  };
 }
 await p.evaluate(()=>document.activeElement?.blur());
 let warm={chromatic:400,float:240,rally:60,brika:300}[key];
 for(let f=0;f<warm;f++){await tick(f,true);await advance(f);if(f%60===0)console.log('WARMUP',key,f);if(key==='chromatic'&&f>120){const s=await read();const occupied=s.board.flatMap((r,y)=>r.filter(Boolean).map(()=>y));if(occupied.length>=27&&occupied.filter(y=>y>=3&&y<=6).length>=4){warm=f+1;break}}}
 const clip=await p.evaluate(ss=>{const rs=ss.map(s=>document.querySelector(s).getBoundingClientRect());const x=Math.floor(Math.min(...rs.map(r=>r.x))),y=Math.floor(Math.min(...rs.map(r=>r.y)));return{x,y,width:Math.ceil(Math.max(...rs.map(r=>r.right)))-x,height:Math.ceil(Math.max(...rs.map(r=>r.bottom)))-y}},selectors);
 console.log('CAPTURE',key,clip,'warmup',warm,JSON.stringify(await read()).slice(0,200));
 // Native DOM backdrop retained only where opaque; canvases are copied losslessly.
 let backdrop=null,fingerprint='';
 async function pixels(){
  const fp=await p.evaluate(()=>[...document.querySelectorAll('.hud,.stats,.dashboard')].map(e=>e.textContent).join('|'));
  if(!backdrop||fp!==fingerprint){
   if(key==='float'){
    const style=await p.addStyleTag({content:'html,body,#app,.game-shell{background:transparent!important;box-shadow:none!important}canvas{visibility:hidden!important}'});
    backdrop=(await p.screenshot({type:'png',omitBackground:true,clip})).toString('base64');await style.evaluate(e=>e.remove());
   }else backdrop=(await p.screenshot({type:'png',clip})).toString('base64');
   fingerprint=fp;
  }
  return p.evaluate(async({backdrop,clip,float})=>{const image=new Image();image.src='data:image/png;base64,'+backdrop;await image.decode();const out=document.createElement('canvas');out.width=clip.width;out.height=clip.height;const ctx=out.getContext('2d');if(!float)ctx.drawImage(image,0,0);for(const c of document.querySelectorAll('canvas')){const r=c.getBoundingClientRect();if(r.width&&r.height&&r.x>=clip.x&&r.y>=clip.y&&r.right<=clip.x+clip.width+1&&r.bottom<=clip.y+clip.height+1)ctx.drawImage(c,r.x-clip.x,r.y-clip.y,r.width,r.height)}if(float)ctx.drawImage(image,0,0);return out.toDataURL('image/png').split(',')[1]}, {backdrop,clip,float:key==='float'});
 }
 const seconds=process.env.ARCADE_PILOT?2:12;
 const enc=spawn('ffmpeg',['-v','error','-n','-f','image2pipe','-framerate','30','-vcodec','png','-i','pipe:0','-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-an','-c:v','libx264','-threads','1','-preset','fast','-crf','12','-g','30','-pix_fmt','yuv420p','-movflags','+faststart',output]);enc.stderr.on('data',d=>process.stderr.write(d));
 try{for(let f=0;f<seconds*30;f++){await tick(warm+f,false);await advance(warm+f);const data=Buffer.from(await pixels(),'base64');if(!enc.stdin.write(data))await once(enc.stdin,'drain');states.push({frame:f,state:await read()});if(f%60===0){fs.writeFileSync(`${evidence}/${key}-${f}.png`,data);console.log(key,f/30)}}}finally{enc.stdin.end();const[code]=await once(enc,'close');if(code)throw Error('Encode '+code)}
 fs.writeFileSync(`${evidence}/${key}.json`,JSON.stringify({url,clip,fps:30,seconds,warmupFrames:warm,clock:'native RAF callbacks at exact 60Hz, 2 per recorded frame; no engine mutations',actions,states},null,2));await p.close();
}}finally{await browser.close()}
