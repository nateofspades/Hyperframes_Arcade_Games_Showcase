export async function prepare(page,key){
 if(['block','chromatic','float','serpent'].includes(key)){return (await import('./puzzle-controls.mjs')).prepare(page,key);}
 if(key==='rally'){
 await page.selectOption('#difficulty','hard');await page.locator('#start').click({force:true});await page.waitForTimeout(1600);let last='';
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
 return {selector:'#game-canvas',state:()=>page.evaluate(()=>window.__arcade.snapshot()),tick:async f=>{if(f%12!==0)return;const s=await page.evaluate(()=>window.__arcade.snapshot());if(s.status!=='playing')return;const t=s.targets[0];if(t){const r=await page.locator('#game-canvas').boundingBox();await page.mouse.click(r.x+t.x*r.width/s.width,r.y+t.y*r.height/s.height);}}};
 }
}
