import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const url=process.argv[2]||'http://127.0.0.1:3019/';
const label=process.argv[3]||'local';
fs.mkdirSync('evidence/pages',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 const response=await page.goto(url,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
 await page.waitForFunction(()=>document.querySelector('video').readyState>=2,null,{timeout:60000});
 const info=await page.locator('video').evaluate(async v=>{await v.play();return {duration:v.duration,width:v.videoWidth,height:v.videoHeight,controls:v.controls,autoplay:v.autoplay,poster:v.poster};});
 assert.equal(info.width,1920);assert.equal(info.height,1080);assert.equal(info.duration,90);assert.equal(info.controls,true);assert.equal(info.autoplay,false);
 await page.waitForFunction(()=>document.querySelector('video').currentTime>.5,null,{timeout:30000});
 await page.locator('video').evaluate(v=>new Promise(resolve=>{v.pause();v.addEventListener('seeked',resolve,{once:true});v.currentTime=36;}));
 const seekInfo=await page.locator('video').evaluate(v=>({time:v.currentTime,paused:v.paused,readyState:v.readyState,error:v.error?.message}));
 console.log('Seek result',JSON.stringify(seekInfo));
 await page.waitForFunction(()=>Math.abs(document.querySelector('video').currentTime-36)<.2);
 assert.equal(await page.locator('.game').count(),8);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:`evidence/pages/${label}-desktop.png`,fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:`evidence/pages/${label}-mobile.png`,fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({url,info,games:8,playback:'advanced',seek:36,desktop:'no overflow',mobile:'no overflow',errors},null,2));
}finally{await browser.close();}
