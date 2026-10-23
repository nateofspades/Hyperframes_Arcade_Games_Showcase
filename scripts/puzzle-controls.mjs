// Read-only state observation + real keyboard controls. No game mutations/fixtures.
export const GAME_INFO = {
  block: { repo: '4_Block_Theory_Game', canvas: '#board', grid: [10,20], logical: null },
  chromatic: { repo: 'Chromatic_Cure_Game', canvas: '#board', grid: [8,16], logical: [320,640] },
  float: { repo: 'Float_Tweet_Bounce_Game', canvas: '#game', logical: [360,640] },
  serpent: { repo: 'Serpent_Supper_Game', canvas: '#game', grid: [24,24], logical: [720,720] },
};
export function normalizeKey(key) {
  const k = String(key).toLowerCase();
  if (k.includes('4_block') || k === 'tetris' || k === 'block') return 'block';
  if (k.includes('chromatic')) return 'chromatic';
  if (k.includes('float') || k === 'flappy') return 'float';
  if (k.includes('serpent') || k === 'snake') return 'serpent';
  throw new Error(`Unknown puzzle game: ${key}`);
}
// Exact rotation cells from the unmodified engine, not a substitute renderer.
export const SHAPES = {
 I:[[[0,1],[1,1],[2,1],[3,1]],[[2,0],[2,1],[2,2],[2,3]],[[0,2],[1,2],[2,2],[3,2]],[[1,0],[1,1],[1,2],[1,3]]],
 J:[[[0,0],[0,1],[1,1],[2,1]],[[1,0],[2,0],[1,1],[1,2]],[[0,1],[1,1],[2,1],[2,2]],[[1,0],[1,1],[0,2],[1,2]]],
 L:[[[2,0],[0,1],[1,1],[2,1]],[[1,0],[1,1],[1,2],[2,2]],[[0,1],[1,1],[2,1],[0,2]],[[0,0],[1,0],[1,1],[1,2]]],
 O:Array.from({length:4},()=>[[1,0],[2,0],[1,1],[2,1]]),
 S:[[[1,0],[2,0],[0,1],[1,1]],[[1,0],[1,1],[2,1],[2,2]],[[1,1],[2,1],[0,2],[1,2]],[[0,0],[0,1],[1,1],[1,2]]],
 T:[[[1,0],[0,1],[1,1],[2,1]],[[1,0],[1,1],[2,1],[1,2]],[[0,1],[1,1],[2,1],[1,2]],[[1,0],[0,1],[1,1],[1,2]]],
 Z:[[[0,0],[1,0],[1,1],[2,1]],[[2,0],[1,1],[2,1],[1,2]],[[0,1],[1,1],[1,2],[2,2]],[[1,0],[0,1],[1,1],[0,2]]],
};
function blockCandidates(board,type,startY=-1) {
 const out=[];
 for(let rotation=0;rotation<4;rotation++) for(let x=-3;x<10;x++) {
  const cells=SHAPES[type][rotation];
  const valid=y=>cells.every(([a,b])=>x+a>=0&&x+a<10&&y+b<20&&(y+b<0||!board[y+b][x+a]));
  if(!valid(startY)) continue;
  let y=startY; while(valid(y+1)) y++;
  if(cells.some(([,b])=>y+b<0)) continue;
  let next=board.map(r=>r.slice()); cells.forEach(([a,b])=>next[y+b][x+a]=type);
  const lines=next.filter(r=>r.every(Boolean)).length;
  next=next.filter(r=>!r.every(Boolean)); while(next.length<20)next.unshift(Array(10).fill(null));
  const heights=Array.from({length:10},(_,i)=>{const j=next.findIndex(r=>r[i]);return j<0?0:20-j;});
  let holes=0; for(let i=0;i<10;i++)for(let j=20-heights[i];j<20;j++)if(!next[j][i])holes++;
  const rough=heights.slice(1).reduce((s,v,i)=>s+Math.abs(v-heights[i]),0);
  const value=lines*8-heights.reduce((a,b)=>a+b,0)*0.51-holes*8-rough*0.28-Math.max(...heights)*0.3;
  out.push({rotation,x,y,value,lines,board:next});
 }
 return out;
}
export function planBlock(s) {
 if(!s.active)return null;
 const candidates=blockCandidates(s.board,s.active.type,s.active.y);
 // One-piece lookahead substantially reduces wells and gives genuine line clears.
 for(const c of candidates) {
  if(s.nextType) {
   const next=blockCandidates(c.board,s.nextType);
   c.value+=next.length?0.65*Math.max(...next.map(n=>n.value)):-1000;
  }
 }
 candidates.sort((a,b)=>b.value-a.value);
 const best=candidates[0]; return best?{rotation:best.rotation,x:best.x}:null;
}
export function planSnake(s) {
 if(s.status!=='running'||!s.food||s.turns?.length)return null;
 const n=s.size,head=s.snake[0],id=p=>p.y*n+p.x;
 const blocked=new Set(s.snake.slice(1,-1).map(id));
 const dirs=[['ArrowUp',0,-1],['ArrowRight',1,0],['ArrowDown',0,1],['ArrowLeft',-1,0]];
 const queue=[{...head,first:null}],seen=new Set([id(head)]);
 for(let i=0;i<queue.length;i++) {
  const p=queue[i];
  for(const [key,dx,dy] of dirs) {
   if(i===0&&dx===-s.direction.x&&dy===-s.direction.y)continue;
   const q={x:p.x+dx,y:p.y+dy,first:p.first||key};
   if(q.x<0||q.y<0||q.x>=n||q.y>=n||blocked.has(id(q))||seen.has(id(q)))continue;
   if(q.x===s.food.x&&q.y===s.food.y)return q.first;
   seen.add(id(q));queue.push(q);
  }
 }
 // If food is sealed off, keep the largest reachable free region available.
 let best=null;
 for(const [key,dx,dy]of dirs) {
  if(dx===-s.direction.x&&dy===-s.direction.y)continue;
  const q={x:head.x+dx,y:head.y+dy};
  if(q.x<0||q.y<0||q.x>=n||q.y>=n||blocked.has(id(q)))continue;
  const todo=[q],visited=new Set([id(q)]);
  for(let i=0;i<todo.length;i++)for(const [,a,b]of dirs){const p={x:todo[i].x+a,y:todo[i].y+b};if(p.x>=0&&p.y>=0&&p.x<n&&p.y<n&&!blocked.has(id(p))&&!visited.has(id(p))){visited.add(id(p));todo.push(p);}}
  if(!best||visited.size>best.area)best={key,area:visited.size};
 }
 return best?.key||null;
}
export function shouldFlap(s) {
 if(s.state!=='playing')return false;
 const b=s.bird,c=s.config;
 const pipe=s.pipes.find(p=>p.x+c.pipeWidth>b.x-b.radius);
 const center=pipe?pipe.gapY+pipe.gap/2:300;
 // A flap rises ~58 logical px; cycle runs center-38 .. center+20.
 return (b.vy>=0 && b.y>center+18) || (b.y>center+65 && b.vy>-250);
}
export function planCapsule(s) {
 if(!s.active)return null;
 const {board,active}=s,dirs=[[1,0],[0,1],[-1,0],[0,-1]];
 let best=null;
 for(let dir=0;dir<4;dir++)for(let x=0;x<8;x++) {
  const [dx,dy]=dirs[dir];
  let y=dir===3?1:0;
  const cells=yy=>[{x,y:yy,color:active.colors[0]},{x:x+dx,y:yy+dy,color:active.colors[1]}];
  const valid=yy=>cells(yy).every(p=>p.x>=0&&p.x<8&&p.y>=0&&p.y<16&&!board[p.y][p.x]);
  if(!valid(y))continue;while(valid(y+1))y++;
  const b=board.map(r=>r.slice()); cells(y).forEach(p=>b[p.y][p.x]={color:p.color,kind:'capsule'});
  let value=y*0.15,matched=new Set();
  for(let yy=0;yy<16;yy++)for(let xx=0;xx<8;xx++)if(b[yy][xx])for(const [a,d]of [[1,0],[0,1]]){
   const run=[];let u=xx,v=yy;while(u<8&&v<16&&b[v][u]?.color===b[yy][xx].color){run.push([u,v]);u+=a;v+=d;}
   if(run.length>=4)for(const [u,v]of run)matched.add(v*8+u);
  }
  for(const p of cells(y)) {
   // Build toward anchor-aligned vertical runs rather than arbitrary same-color clutter.
   for(const [a,d]of [[1,0],[-1,0],[0,1],[0,-1]]){
    let length=1,anchors=0,u=p.x+a,v=p.y+d;
    while(u>=0&&u<8&&v>=0&&v<16&&b[v][u]?.color===p.color){length++;if(b[v][u].kind==='virus')anchors++;u+=a;v+=d;}
    value+=(length-1)*(length-1)*(anchors?7:2);
   }
   const below=b[p.y+1]?.[p.x];
   if(below&&below.color!==p.color)value-=2;
   value-=Math.max(0,8-p.y)*2;
  }
  for(const index of matched)value+=b[Math.floor(index/8)][index%8].kind==='virus'?160:25;
  if(!best||value>best.value)best={x,dir,value};
 }
 return best;
}
export async function readState(page,key) {
 key=normalizeKey(key);
 if(key==='block')return page.evaluate(()=>{const g=window.__tetris;return {state:g.state,active:g.active,board:g.board,nextType:g.nextType,score:g.score,lines:g.lines};});
 if(key==='float')return page.evaluate(()=>{const g=window.__flappy.game;return {state:g.state,bird:g.bird,pipes:g.pipes,config:g.config,score:g.score,elapsed:g.elapsed};});
 if(key==='serpent')return page.evaluate(async()=>{const {game:g}=await import(new URL('./app.js',location.href).href);return {status:g.status,size:g.size,snake:g.snake,food:g.food,direction:g.direction,turns:g.turns,score:g.score,interval:g.interval};});
 return page.evaluate(()=>{
  // Public Chromatic has no instance export/debug hook. Observe real rendered pixels.
  // labTest is localhost-only and deliberately not required or invoked here.
  const c=document.querySelector('#board'),ctx=c.getContext('2d'),im=ctx.getImageData(0,0,c.width,c.height),data=im.data;
  const palette=[[244,168,202],[155,223,229],[232,189,107]],board=Array.from({length:16},()=>Array(8).fill(null));
  for(let y=0;y<16;y++)for(let x=0;x<8;x++){
   const counts=[0,0,0];
   // Sample upper tile area: anchored outline at .12 and facet fill at .25.
   for(let sy=0.1;sy<=0.7;sy+=0.04)for(let sx=0.15;sx<=0.85;sx+=0.04){
    const px=Math.min(c.width-1,Math.floor((x+sx)*c.width/8)),py=Math.min(c.height-1,Math.floor((y+sy)*c.height/16)),i=(py*c.width+px)*4;
    const distances=palette.map(p=>p.reduce((s,v,j)=>s+(v-data[i+j])**2,0));
    const color=distances.indexOf(Math.min(...distances));
    if(distances[color]<1600)counts[color]++;
   }
   const color=counts.indexOf(Math.max(...counts));
   // Ghost opacity .18 is far below this color-distance threshold.
   if(counts[color]>=3){
    const px=Math.floor((x+0.4)*c.width/8),py=Math.floor((y+0.26)*c.height/16),i=(py*c.width+px)*4;
    const filled=palette[color].reduce((s,v,j)=>s+(v-data[i+j])**2,0)<1600;
    board[y][x]={color,kind:filled?'capsule':'virus',link:null};
   }
  }
  let active=null;
  if(board[0][3]?.kind==='capsule'&&board[0][4]?.kind==='capsule'){
   active={x:3,y:0,dir:0,colors:[board[0][3].color,board[0][4].color]};board[0][3]=null;board[0][4]=null;
  }
  return {board,active,score:Number(document.querySelector('#score').textContent),viruses:Number(document.querySelector('#viruses').textContent),overlay:!document.querySelector('#overlay').hidden};
 });
}
export async function startGame(page,key,{navigate=false,base='https://nateofspades.github.io'}={}) {
 key=normalizeKey(key);
 if(navigate)await page.goto(`${base}/${GAME_INFO[key].repo}/`,{waitUntil:'networkidle'});
 await page.locator(GAME_INFO[key].canvas).waitFor({state:'visible'});
 if(key==='block')await page.waitForFunction(()=>!!window.__tetris);
 if(key==='float')await page.waitForFunction(()=>!!window.__flappy);
 await page.locator(key==='float'?'#start-button':'#primary').click({force:true,noWaitAfter:true});
 // Remove interactive-button focus so Space reaches game listeners.
 await page.evaluate(()=>document.activeElement?.blur());
 return createController(page,key);
}
export function createController(page,key) {
 key=normalizeKey(key);
 let time=0,nextAction=0,queue=[],lastHead='',pendingTarget=null,decisions=0;
 return {
  key,
  async step(dt=1000/30){
   time+=dt;
   // Queued operations spaced apart so the recording sees real positioning.
   if(queue.length){if(time>=nextAction){await page.keyboard.press(queue.shift());nextAction=time+60;}return;}
   if(time<nextAction)return;
   const s=await readState(page,key);
   if(key==='float'){
    if(s.state==='gameover')throw new Error(`Float crashed after ${s.score} passes`);
    if(shouldFlap(s))await page.keyboard.press('Space');
    return;
   }
   if(key==='serpent'){
    if(s.status==='over')throw new Error(`Serpent crashed at score ${s.score}`);
    const head=JSON.stringify(s.snake[0]);if(head===lastHead)return;
    lastHead=head;const action=planSnake(s);if(action)await page.keyboard.press(action);return;
   }
   if(key==='block'){
    if(s.state!=='playing')throw new Error(`4 Block state ${s.state}`);
    const target=planBlock(s);if(!target)return;
    const rotations=(target.rotation-s.active.rotation+4)%4;
    queue.push(...Array(rotations).fill('ArrowUp'));
    queue.push(...Array(Math.abs(target.x-s.active.x)).fill(target.x<s.active.x?'ArrowLeft':'ArrowRight'));
    queue.push('Space');nextAction=time+60;decisions++;return;
   }
   if(s.overlay)return;
   if(!s.active)return;
   // Freshly spawned pairs are recognized visually at columns 3/4, row 0.
   const target=planCapsule(s);if(!target)return;
   // First descend one row: dir=3 needs an upper partner above its pivot.
   queue.push('ArrowDown',...Array(target.dir).fill('ArrowUp'));
   queue.push(...Array(Math.abs(target.x-3)).fill(target.x<3?'ArrowLeft':'ArrowRight'),'Space');
   nextAction=time+60;decisions++;
  },
  async snapshot(){return {key,time,decisions,state:await readState(page,key)};},
 };
}
export async function prepare(page,key,options={}) {
 key=normalizeKey(key);
 const controller=await startGame(page,key,options);
 let previousFrame=-1;
 return {
  selector:GAME_INFO[key].canvas,
  warmupMs:key==='float'?3000:0,
  // No clocks, sleeps, screenshots, or simulation updates: the caller owns time.
  async tick(frame){
   const dt=previousFrame<0?1000/30:Math.max(1,frame-previousFrame)*1000/30;
   previousFrame=frame;await controller.step(dt);
  },
  state:()=>readState(page,key),
  controller,
 };
}
// Parent may instead call startGame, then controller.step(1000/30), clock.runFor,
// screenshot each frame. This keeps keyboard inputs and all rendered simulation authentic.
export async function captureGame(page,key,seconds=12,options={}) {
 const controller=options.controller||await startGame(page,key,options);
 const fps=options.fps||30,dt=1000/fps,frames=Math.round(seconds*fps);
 const advance=options.advance||(ms=>page.waitForTimeout(ms));
 for(let i=0;i<frames;i++){
  await controller.step(dt);await advance(dt);
  if(options.onFrame)await options.onFrame(page,i,controller);
 }
 return controller.snapshot();
}
