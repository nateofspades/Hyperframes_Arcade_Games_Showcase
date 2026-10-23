// Browser-free verification against the repositories' actual rule engines.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {planBlock,planCapsule,planSnake,shouldFlap,SHAPES,createController} from './puzzle-controls.mjs';
const root=process.env.ARCADE_REFERENCE_ROOT;
if(!root) throw new Error('Optional recapture-control tests need ARCADE_REFERENCE_ROOT pointing to inspection checkouts (with trailing slash). See docs/EDITING.md.');
const load=(repo,file)=>import(pathToFileURL(root+repo+'/'+file));
const {TetrisEngine,SHAPES:realShapes}=await load('4_Block_Theory_Game','src/engine.js');
const {Game:Float}=await load('Float_Tweet_Bounce_Game','src/engine.js');
const {Engine:Snake}=await load('Serpent_Supper_Game','engine.js');
const {Game:Capsule,rng}=await load('Chromatic_Cure_Game','src/rules.js');
assert.deepEqual(SHAPES,realShapes);
const results={block:[],float:[],serpent:[],chromatic:[]};
for(let seed=1;seed<=12;seed++){
 const block=new TetrisEngine({random:rng(seed),storage:null});block.start();
 for(let i=0;i<24&&block.state==='playing';i++){
  const p=planBlock(block);assert.ok(p);
  for(let j=0;j<p.rotation;j++)block.rotate();
  while(block.active.x!==p.x){if(!block.move(Math.sign(p.x-block.active.x),0))throw new Error('blocked horizontal plan');}
  block.hardDrop();
 }
 assert.equal(block.state,'playing');assert.ok(block.lines>0);
 results.block.push({seed,lines:block.lines,score:block.score});
 const float=new Float({random:rng(seed)});float.start();float.advance(3);
 for(let frame=0;frame<360&&float.state==='playing';frame++){
  if(shouldFlap(float))float.flap();float.advance(1/30);
 }
 results.float.push({seed,state:float.state,score:float.score});
 const snake=new Snake({random:rng(seed)});snake.start();
 const keys={ArrowUp:'up',ArrowRight:'right',ArrowDown:'down',ArrowLeft:'left'};
 let elapsed=0;while(elapsed<12000&&snake.status==='running'){
  const key=planSnake(snake);if(key)snake.turn(keys[key]);elapsed+=Math.ceil(snake.interval/(1000/30))*(1000/30);snake.tick();
 }
 assert.equal(snake.status,'running');assert.ok(snake.score>0);
 results.serpent.push({seed,score:snake.score,length:snake.snake.length});
 const capsule=new Capsule(seed);capsule.start();
 for(let i=0;i<18&&capsule.status==='playing';i++){
  const p=planCapsule(capsule);if(!p)break;
  capsule.drop();for(let j=0;j<p.dir;j++)capsule.rotate();
  let guard=0;while(capsule.active.x!==p.x&&guard++<10){if(!capsule.move(Math.sign(p.x-capsule.active.x)))break;}
  capsule.hardDrop();for(let ticks=0;ticks<300&&capsule.status==='playing'&&!capsule.active;ticks++)capsule.tick(1000/60);
 }
 results.chromatic.push({seed,status:capsule.status,score:capsule.score,anchors:capsule.viruses});
}
console.log(JSON.stringify(results,null,2));
assert.ok(results.float.every(r=>r.state==='playing'&&r.score>=3),'Float must survive twelve seconds / several gaps');
assert.ok(results.chromatic.every(r=>r.score>0),'Capsule planner must produce matches');
console.log('PASS: exact shapes; real-engine seeded line clears, gap passes, food growth, capsule matches. Not a browser/pixel-reader test.');
// Exercise the actual per-frame action queues against real engines. The fake page
// only adapts observations/key events; all gameplay transitions are original code.
for(const key of ['block','chromatic','float','serpent']) {
 const game=key==='block'?new TetrisEngine({random:rng(1),storage:null}):key==='chromatic'?new Capsule(1):key==='float'?new Float({random:rng(1)}):new Snake({random:rng(1)});
 game.start();if(key==='float')game.advance(3);
 const page={evaluate:async()=>key==='chromatic'?{board:game.board,active:game.active?.y===0?game.active:null,score:game.score,overlay:game.status!=='playing'}:game,
 keyboard:{press:async name=>{
  if(key==='float'){if(name==='Space')game.flap();return;}
  if(key==='serpent'){game.turn({ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[name]);return;}
  if(name==='Space')game.hardDrop();
  if(name==='ArrowUp')game.rotate();
  if(name==='ArrowDown')key==='block'?game.softDrop():game.drop();
  if(name==='ArrowLeft')game.move(-1,0);if(name==='ArrowRight')game.move(1,0);
 }}};
 const ctl=createController(page,key);let elapsed=0;
 for(let frame=0;frame<360;frame++){
  await ctl.step(1000/30);elapsed+=1000/30;
  if(key==='float')game.advance(1/30);
  if(key==='chromatic'){game.tick(1000/60);game.tick(1000/60);}
  if(key==='block'&&elapsed>=900){game.move(0,1);elapsed=0;}
  if(key==='serpent'&&elapsed>=game.interval){game.tick();elapsed=0;}
 }
 console.log('queued-controller',key,JSON.stringify({score:game.score,lines:game.lines,anchors:game.viruses,state:game.state||game.status}));
 assert.ok(game.score>0);if(key==='block')assert.ok(game.lines>0);
 if(key==='chromatic')assert.ok(game.viruses<8);
}
console.log('PASS: actual frame-stepped controller queues (browser-free).');
