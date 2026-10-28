import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
const browser=await chromium.launch({headless:false,env:{...process.env,DISPLAY:':98'},args:['--no-sandbox','--window-position=0,0']});
try{
 const page=await browser.newPage({viewport:{width:1500,height:1100}});
 await page.goto('https://nateofspades.github.io/Aim_Alley_Arcade_Game/');await page.locator('#enter').click();await page.getByRole('button',{name:/Target Practice/}).click();await page.locator('#start').click();
 const b=await page.locator('#game-canvas').boundingBox();
 console.log('native cursor style',await page.locator('#game-canvas').evaluate(e=>getComputedStyle(e).cursor),b);
 // Chromium's page area begins below the native browser toolbar.
 console.log(execFileSync('python3',['scripts/native-cursor.py',String(Math.round(b.x+b.width/2)),String(Math.round(b.y+b.height/2+87)),'evidence/revision/native-crosshair.png'],{encoding:'utf8'}));
 await page.screenshot({path:'evidence/revision/native-cursor-source.png'});
}finally{await browser.close();}
