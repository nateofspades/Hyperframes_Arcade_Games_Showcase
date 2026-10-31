// Authentic Chromatic Cure capture: read-only pixel observation; real keyboard only.
// Run scout first, then CAPTURE_START=<frame> CAPTURE_FRAMES=270 node this-file.mjs capture.
import {chromium} from 'playwright';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {startGame,readState,planCapsule} from './puzzle-controls.mjs';
const root='evidence/final-three', mode=process.argv[2]||'scout';fs.mkdirSync(root,{recursive:true});
const output='assets/footage/final-three-2026-10-31/chromatic.mp4';
const start=Number(process.env.CAPTURE_START||0),length=Number(process.env.CAPTURE_FRAMES||270);
const end=mode==='scout'?360:start+length;
if(mode==='capture'&&fs.existsSync(output))throw Error('Refusing overwrite '+output);
const browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage','--mute-audio']});
const actions=[],states=[],placements=[];
try{
const p=await browser.newPage({viewport:{width:1600,height:1300}});
await p.clock.install({time:new Date('2026-01-01T00:00:00Z')});await p.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
await p.addInitScript(()=>{let now=0,id=0,queue=new Map();performance.now=()=>now;window.requestAnimationFrame=cb=>{queue.set(++id,cb);return id};window.cancelAnimationFrame=id=>queue.delete(id);window.__captureRaf=()=>{now+=1000/60;const pending=queue;queue=new Map();for(const cb of pending.values())cb(now)}});
const url='https://nateofspades.github.io/Chromatic_Cure_Game/';
const response=await p.goto(url);if(response.status()!==200)throw Error('HTTP '+response.status());
await p.evaluate(()=>document.fonts.ready);await p.clock.runFor(150);await startGame(p,'chromatic');
// Identical HUD layout/CSS and crop to capture-targeted.mjs. No rules changed.
await p.addStyleTag({content:'.lattice-label,.lattice-foot,.preview,.session,.thumbs,.music,.how{visibility:hidden!important}.stats{display:flex!important;align-items:center!important;justify-content:space-around!important;padding:8px!important;gap:6px!important}.stats .numbers{display:contents!important}.stats .numbers>div,.stats .level-stat,.stats .anchor-stat{display:flex!important;flex-direction:column!important;border:0!important;margin:0!important;padding:0!important;gap:3px!important}.stats strong{font-size:23px!important}.stats span{font-size:9px!important}.channel-icon,#chain{display:none!important}'});
await p.evaluate(()=>{const b=document.querySelector('#board').getBoundingClientRect(),s=document.querySelector('.stats');Object.assign(s.style,{position:'fixed',left:b.x+'px',top:(b.y-74)+'px',width:b.width+'px',height:'74px',zIndex:'9',boxSizing:'border-box'})});
const clip=await p.evaluate(()=>{const rs=['.stats','#board'].map(s=>document.querySelector(s).getBoundingClientRect());const x=Math.floor(Math.min(...rs.map(r=>r.x))),y=Math.floor(Math.min(...rs.map(r=>r.y)));return{x,y,width:Math.ceil(Math.max(...rs.map(r=>r.right)))-x,height:Math.ceil(Math.max(...rs.map(r=>r.bottom)))-y}});
if(JSON.stringify(clip)!==JSON.stringify({x:476,y:39,width:316,height:706}))throw Error('Crop differs '+JSON.stringify(clip));
let backdrop=null,fingerprint='';
async function pixels(){const fp=await p.evaluate(()=>[...document.querySelectorAll('.hud,.stats,.dashboard')].map(e=>e.textContent).join('|'));if(!backdrop||fp!==fingerprint){backdrop=(await p.screenshot({type:'png',clip})).toString('base64');fingerprint=fp;}return p.evaluate(async({backdrop,clip})=>{const image=new Image();image.src='data:image/png;base64,'+backdrop;await image.decode();const out=document.createElement('canvas');out.width=clip.width;out.height=clip.height;const ctx=out.getContext('2d');ctx.drawImage(image,0,0);for(const c of document.querySelectorAll('canvas')){const r=c.getBoundingClientRect();if(r.width&&r.height&&r.x>=clip.x&&r.y>=clip.y&&r.right<=clip.x+clip.width+1&&r.bottom<=clip.y+clip.height+1)ctx.drawImage(c,r.x-clip.x,r.y-clip.y,r.width,r.height)}return out.toDataURL('image/png').split(',')[1]}, {backdrop,clip})}
let enc=null;
if(mode==='capture'){fs.mkdirSync('assets/footage/final-three-2026-10-31',{recursive:true});enc=spawn('ffmpeg',['-v','error','-n','-f','image2pipe','-framerate','30','-vcodec','png','-i','pipe:0','-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-an','-c:v','libx264','-threads','1','-preset','fast','-crf','12','-g','30','-pix_fmt','yuv420p','-movflags','+faststart',output]);enc.stderr.on('data',d=>process.stderr.write(d));}
let queue=[],next=0,busy=false,piece=0,decision=null,descending=false;
for(let f=0;f<end;f++){
 const s=await readState(p,'chromatic');if(s.overlay)throw Error('Game stopped at '+f);
 if(!busy&&s.active){
  const target=piece===0?{x:4,dir:1,reason:'Two rose blocks above existing rose anchor'}:piece===1?{x:4,dir:1,reason:'Rose lower half completes the existing rose trio; amber stays above the clear'}:planCapsule(s);if(!target)throw Error('No placement');
  decision={piece:piece++,spawnFrame:f,colors:s.active.colors,target,before:s};placements.push(decision);
  // Track the full planned input sequence; the visual reader recognizes only spawn.
  queue=['ArrowDown',...Array(target.dir).fill('ArrowUp'),...Array(Math.abs(target.x-3)).fill(target.x<3?'ArrowLeft':'ArrowRight')];
  // A short aiming pause, then visible native one-cell soft drops. No hard drops.
  queue.push('WAIT');busy=true;descending=false;next=f+7;
 }
 if(busy&&f>=next){
  const k=queue.length?queue.shift():'ArrowDown';
  if(k==='WAIT'){descending=true;next=f+6;}
  else{
   let locking=false;
   if(descending){
    // Observe the moving pair against the last settled board. This reads only
    // real pixels; the engine alone decides movement, locking and matching.
    const moving=[];
    for(let y=0;y<16;y++)for(let x=0;x<8;x++)if(s.board[y][x]&&!decision.before.board[y][x])moving.push({x,y});
    if(moving.length!==2)throw Error('Cannot observe falling pair '+JSON.stringify({f,moving}));
    locking=moving.some(c=>c.y===15||decision.before.board[c.y+1][c.x]);
   }
   actions.push({frame:f,seconds:f/30,piece:decision.piece,key:k});await p.keyboard.press(k);next=f+(descending?3:5);
   if(locking){decision.lockFrame=f;decision.afterInput=await readState(p,'chromatic');busy=false;descending=false;next=f+8;}
  }
 }
 await p.clock.runFor(Math.round((f+1)*1000/30)-Math.round(f*1000/30));await p.evaluate(()=>{__captureRaf();__captureRaf()});
 const after=await readState(p,'chromatic');states.push({frame:f,state:after});
 if(mode==='capture'&&f>=start){const data=Buffer.from(await pixels(),'base64');if(!enc.stdin.write(data))await once(enc.stdin,'drain');if((f-start)%30===0)fs.writeFileSync(`${root}/chromatic-${f-start}.png`,data);}
 if(f%150===0)console.log(mode,f,'score',after.score,'anchors',after.viruses,'pieces',piece);
}
if(enc){enc.stdin.end();const [code]=await once(enc,'close');if(code)throw Error('Encode '+code);}
const report={url,mode,clip,fps:30,clock:'Exact native 60Hz RAF callbacks, two per output frame; fixed wall clock installed before loading. No engine mutations, fixtures, debug hooks, injected game state or altered rules.',controller:'Read rendered pixels, purposeful rose-trio setup followed by planCapsule color/anchor heuristic. 167ms positioning taps, 200ms aim pause, 100ms native one-row soft drops. No hard drops.',captureStartFrame:start,captureFrames:length,actions,placements,states};
fs.writeFileSync(`${root}/chromatic-${mode}.json`,JSON.stringify(report,null,2));
const verticalRuns=b=>{const runs=[];for(let x=0;x<8;x++)for(let y=0;y<=12;y++){const cells=b.slice(y,y+4).map(r=>r[x]);if(cells.every(Boolean)&&cells.every(c=>c.color===cells[0].color))runs.push({columnZeroBased:x,rowsZeroBased:[y,y+1,y+2,y+3],color:cells[0].color,cells});}return runs;};
const scoreChanges=states.filter((s,i)=>i&&s.state.score!==states[i-1].state.score).map(s=>({frame:s.frame,footageSeconds:(s.frame-start)/30,score:s.state.score,anchors:s.state.viruses,board:s.state.board}));
const matchEvidence=placements.filter(p=>p.lockFrame!=null).map(p=>({piece:p.piece,frame:p.lockFrame,footageSeconds:(p.lockFrame-start)/30,orientation:p.target.dir%2?'vertical':'horizontal',verticalRuns:verticalRuns(p.afterInput.board)})).filter(p=>p.verticalRuns.length);
const inspectionSources=['app.js','rules.js'].map(file=>{const path=`${root}/chromatic-engine/${file}`;return fs.existsSync(path)?{url:`${url}src/${file}`,localReadOnlyCopy:path,sha256:crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex')}:null;}).filter(Boolean);
if(mode==='capture'){const provenance={...report,states:undefined,scoreChanges,matchEvidence,inspectionSources,limitations:['All descent uses the real ArrowDown control at 100ms intervals; no hard drops or invented falling animation.','Pixel-observed board classification may omit pulsing cells during clear; lock-time boards and native score/anchor changes corroborate clears.','Source footage only; parent integrates and verifies the whole-film export.'],placements:placements.filter(x=>x.lockFrame>=start&&x.spawnFrame<end),actions:actions.filter(x=>x.frame>=start),selectedTrim:{startSeconds:0,durationSeconds:Math.min(9,length/30),sourceGameStartSeconds:start/30},sha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex'),probe:JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',output])),fullEvidence:`${root}/chromatic-capture.json`};fs.mkdirSync('docs/provenance/final-three-2026-10-31',{recursive:true});fs.writeFileSync('docs/provenance/final-three-2026-10-31/chromatic.json',JSON.stringify(provenance,null,2));}
}finally{await browser.close()}
