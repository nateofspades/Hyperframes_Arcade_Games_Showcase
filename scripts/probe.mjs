import { chromium } from 'playwright';
import fs from 'node:fs';
const executablePath=process.env.ARCADE_CHROME_PATH || chromium.executablePath();
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--mute-audio']});
const repos=['4_Block_Theory_Game','Chromatic_Cure_Game','Rally_Reactor_Game','Orb_Onslaught_Game','Float_Tweet_Bounce_Game','Serpent_Supper_Game','BrikaVolt_Game','Aim_Alley_Arcade_Game'];
const out=[];fs.mkdirSync('evidence',{recursive:true});
for(const repo of repos){const page=await browser.newPage({viewport:{width:1600,height:1200}});try{const url=`https://nateofspades.github.io/${repo}/`;const r=await page.goto(url);await page.waitForTimeout(700);out.push({repo,url,status:r.status(),title:await page.title(),canvases:await page.locator('canvas').evaluateAll(es=>es.map(e=>({id:e.id,w:e.width,h:e.height,rect:e.getBoundingClientRect().toJSON()}))),buttons:await page.locator('button').allTextContents()});await page.screenshot({path:`evidence/${repo}-menu.png`});console.log(JSON.stringify(out.at(-1)));}catch(e){console.log(repo,String(e));}await page.close();}
fs.writeFileSync('evidence/live-discovery.json',JSON.stringify(out,null,2));await browser.close();
