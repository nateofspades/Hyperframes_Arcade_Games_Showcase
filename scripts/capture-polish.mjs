// Record the unmodified public games. Only capture-specific DOM presentation is changed.
// State is observed read-only; actual input events and the native engine produce every pixel.
import {chromium} from 'playwright';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {startGame,readState,planBlock,planCapsule,createController} from './puzzle-controls.mjs';
process.chdir(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
const root='assets/footage/polished';fs.mkdirSync(root,{recursive:true});fs.mkdirSync('evidence/polished',{recursive:true});
const repos={block:'4_Block_Theory',chromatic:'Chromatic_Cure',float:'Float_Tweet_Bounce',serpent:'Serpent_Supper',brika:'BrikaVolt'};
const browser=await chromium.launch({executablePath:process.env.ARCADE_CHROME_PATH||chromium.executablePath(),args:['--no-sandbox','--disable-dev-shm-usage','--mute-audio']});
try {for(const key of process.argv.slice(2)){
 if(!repos[key])throw Error('Unknown game '+key);const target=`${root}/${key}.mp4`;if(fs.existsSync(target))throw Error('Refuse overwrite '+target);
 const p=await browser.newPage({viewport:{width:1600,height:key==='brika'?1200:1300}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.install({time:new Date('2026-01-01T00:00:00Z')});await p.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
 const url=`https://nateofspades.github.io/${repos[key]}_Game/`;await p.goto(url);await p.clock.runFor(150);await p.evaluate(()=>document.fonts.ready);
 let selectors,read,tick;const actions=[];const press=async(f,k)=>{actions.push({frame:f,key:k});await p.keyboard.press(k);};
 if(['block','chromatic'].includes(key)){
  await startGame(p,key);read=()=>readState(p,key);selectors=['.stats','#board'];
  // Reposition the genuine statistics directly above the unchanged full board.
  await p.addStyleTag({content:key==='block'?'.touch-controls,.previews{visibility:hidden!important}.stats{display:flex!important;align-items:center!important;justify-content:space-around!important;padding:8px!important;gap:6px!important}.stats>div{display:flex;flex-direction:column}.stats small{font-size:11px!important}.stats strong{font-size:23px!important}':'.lattice-label,.lattice-foot,.preview,.session,.thumbs,.music,.how{visibility:hidden!important}.stats{display:flex!important;align-items:center!important;justify-content:space-around!important;padding:8px!important;gap:6px!important}.stats .numbers{display:contents!important}.stats .numbers>div,.stats .level-stat,.stats .anchor-stat{display:flex!important;flex-direction:column!important;border:0!important;margin:0!important;padding:0!important;gap:3px!important}.stats strong{font-size:23px!important}.stats span{font-size:9px!important}.channel-icon,#chain{display:none!important}'});
  await p.evaluate(()=>{const b=document.querySelector('#board').getBoundingClientRect(),s=document.querySelector('.stats');Object.assign(s.style,{position:'fixed',left:b.x+'px',top:(b.y-74)+'px',width:b.width+'px',height:'74px',zIndex:'9',boxSizing:'border-box'});});
  let signature='',queue=[],next=0;
  tick=async f=>{if(f<next)return;const s=await read();if(key==='block'){
    if(s.state!=='playing')throw Error('Block stopped');const sig=JSON.stringify(s.board)+s.active.type;
    if(sig!==signature){signature=sig;const t=planBlock(s);queue=t?[...Array((t.rotation-s.active.rotation+4)%4).fill('ArrowUp'),...Array(Math.abs(t.x-s.active.x)).fill(t.x<s.active.x?'ArrowLeft':'ArrowRight')]:[];next=f+8;return;}
   }else if(s.active){const sig=JSON.stringify(s.board)+s.active.colors.join(',');if(sig!==signature){signature=sig;const t=planCapsule(s);queue=t?['ArrowDown',...Array(t.dir).fill('ArrowUp'),...Array(Math.abs(t.x-3)).fill(t.x<3?'ArrowLeft':'ArrowRight')]:[];next=f+9;return;}}
   const k=queue.length?queue.shift():'ArrowDown';await press(f,k);next=f+(k==='ArrowDown'?3:k==='ArrowUp'?10:7);
  };
 }else if(['float','serpent'].includes(key)){
  const c=await startGame(p,key);read=()=>readState(p,key);tick=f=>c.step(1000/30);selectors=key==='float'?['#game','.hud']:['#game','.scoreboard'];
  await p.addStyleTag({content:key==='float'?'.controls,.instructions{visibility:hidden!important}':'.game-actions,.machine-footer,.sidebar{visibility:hidden!important}'});
 }else{
  // Stabilize only the recording layout. A responsive ResizeObserver can clear
  // this game's canvas after a paused-clock frame; fixed arena bounds avoid it.
  await p.addStyleTag({content:'.arena{width:800px!important;height:1000px!important;flex:none!important}'});await p.clock.runFor(150);
  await p.locator('#primary').click({force:true});await p.evaluate(()=>document.activeElement?.blur());await p.keyboard.down('Space');await p.clock.runFor(34);await p.keyboard.up('Space');read=()=>p.evaluate(()=>window.prismState());selectors=['.hud','#game'];let x=360;
  tick=async f=>{const s=await read();if(s.mode==='ready'){await p.keyboard.down('Space');await p.clock.runFor(34);await p.keyboard.up('Space');}if(f%5)return;const ball=s.balls.filter(b=>b.vy>0).sort((a,b)=>b.y-a.y)[0]||s.balls[0];if(ball){x+=Math.max(-65,Math.min(65,ball.x-x+9*Math.sin(f/41)));const r=await p.locator('#game').boundingBox();await p.mouse.move(r.x+r.width*Math.max(.04,Math.min(.96,x/720)),r.y+r.height*.9);}};
 }
 await p.evaluate(()=>document.activeElement?.blur());const warmup={block:65,chromatic:55,float:8,serpent:42,brika:14}[key];
 for(let f=0;f<warmup*30;f++){await tick(f);await p.clock.runFor(f%3===2?34:33);if(f%300===0)console.log('WARMUP',key,f/30,JSON.stringify(await read()).slice(0,140));}
 const clip=await p.evaluate(ss=>{const rs=ss.map(s=>document.querySelector(s).getBoundingClientRect());const x=Math.floor(Math.min(...rs.map(r=>r.x))),y=Math.floor(Math.min(...rs.map(r=>r.y)));return{x,y,width:Math.ceil(Math.max(...rs.map(r=>r.right)))-x,height:Math.ceil(Math.max(...rs.map(r=>r.bottom)))-y};},selectors);
 console.log('CAPTURE',key,clip);const seconds=14,states=[],cdp=await p.context().newCDPSession(p);let fingerprint='',backdrop;
 const enc=spawn('ffmpeg',['-v','error','-n','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-an','-c:v','libx264','-threads','1','-preset','fast','-crf','17','-g','30','-keyint_min','30','-sc_threshold','0','-pix_fmt','yuv420p','-movflags','+faststart',target]);enc.stderr.on('data',d=>process.stderr.write(d));
 try {for(let f=0;f<seconds*30;f++){
  await tick(warmup*30+f);await p.clock.runFor(f%3===2?34:33);
  if(key==='brika'&&f%120===0){const painted=await p.locator('#game').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=3;i<d.length;i+=160)if(d[i])return true;return false;});if(!painted)throw Error('Native Brika canvas was cleared; reject this take');}
  const fp=await p.evaluate(()=>[...document.querySelectorAll('.hud,.stats,.scoreboard,#overlay,#message,#countdown')].map(e=>e.hidden+':'+getComputedStyle(e).display+':'+e.textContent).join('|'));
  const nativeFrame=key==='float'||key==='brika';
  let base=null;
  if(nativeFrame||f===0||fp!==fingerprint||f%30===0){
   base=key==='brika'?(await p.screenshot({type:'jpeg',quality:96,clip})).toString('base64'):(await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:96,clip:{...clip,scale:1},captureBeyondViewport:true})).data;
   fingerprint=fp;
  }
  // Float has a transparent DOM HUD over the moving field: capture it natively
  // every frame, rather than pasting stale opaque background pixels over motion.
  const pixels=nativeFrame?base:await p.evaluate(async({base,clip})=>{if(base){const im=new Image();im.src='data:image/jpeg;base64,'+base;await im.decode();window.__captureBackdrop=im;}const c=window.__captureOutput||(window.__captureOutput=document.createElement('canvas'));c.width=clip.width;c.height=clip.height;const ctx=c.getContext('2d');ctx.drawImage(window.__captureBackdrop,0,0);for(const s of document.querySelectorAll('canvas')){const r=s.getBoundingClientRect(),style=getComputedStyle(s);if(style.visibility!=='hidden'&&style.display!=='none'&&r.width&&r.height&&r.x>=clip.x&&r.y>=clip.y&&r.right<=clip.x+clip.width+1&&r.bottom<=clip.y+clip.height+1)ctx.drawImage(s,r.x-clip.x,r.y-clip.y,r.width,r.height);}return c.toDataURL('image/jpeg',.96).split(',')[1];},{base,clip});
  const im=Buffer.from(pixels,'base64');if(!enc.stdin.write(im))await once(enc.stdin,'drain');if(f%30===0){states.push({frame:f,state:await read()});console.log(key,f/30);}if(f%120===0)fs.writeFileSync(`evidence/polished/${key}-${f}.jpg`,im);
 }}finally{enc.stdin.end();const [code]=await once(enc,'close');if(code)throw Error('ffmpeg '+code);}
 if(errors.length)throw Error('Game runtime errors: '+errors.join('; '));
 const ledger={url,clip,fps:30,seconds,warmup_seconds:warmup,actions,states,errors,presentation:'Capture-only CSS places real HUD above board or fixes recording viewport bounds; state and mechanics unmodified.'};fs.writeFileSync(`evidence/polished/${key}.json`,JSON.stringify(ledger,null,2));await p.close();
}}finally{await browser.close();}
