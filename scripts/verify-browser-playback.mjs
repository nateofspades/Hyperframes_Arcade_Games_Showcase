// Real-time, start-to-ended playback regression: Firefox or Chromium, audio included.
// node scripts/verify-browser-playback.mjs ENGINE PAGE_URL REPORT_JSON [VIDEO_OVERRIDE]
import {chromium,firefox} from 'playwright';
import fs from 'node:fs';
const [engine,url,output,override]=process.argv.slice(2);
if(!['chromium','firefox'].includes(engine)||!url||!output)throw Error('ENGINE PAGE_URL REPORT_JSON [VIDEO_OVERRIDE]');
const options={headless:true,timeout:120000};
if(engine==='chromium'){
 options.args=['--no-sandbox','--disable-dev-shm-usage'];
 if(process.env.ARCADE_CHROME_PATH)options.executablePath=process.env.ARCADE_CHROME_PATH;
}
const browser=await (engine==='firefox'?firefox:chromium).launch(options);
let report={engine,url};
try{
 const page=await browser.newPage({viewport:{width:1366,height:1000}});
 page.on('console',message=>{if(message.text().startsWith('playback-progress'))console.log(message.text())});
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
 await page.locator('video').waitFor({timeout:60000});
 await page.locator('video').evaluate(async(v,override)=>{
  v.pause();if(override){v.src=override;v.load()}
  if(v.readyState<1)await Promise.race([
   new Promise((resolve,reject)=>{v.addEventListener('loadedmetadata',resolve,{once:true});v.addEventListener('error',()=>reject(Error(v.error?.message)),{once:true})}),
   new Promise((_,reject)=>setTimeout(()=>reject(Error('metadata timeout')),60000))]);
  if(v.error)throw Error(v.error.message);
  v.muted=false;v.volume=1;v.playbackRate=1;
  const state=window.__playbackTest={errors:[],audio:[],float:[],frames:[]};
  if(v.requestVideoFrameCallback){const stamp=(_,metadata)=>{state.frameTime=metadata.mediaTime;v.requestVideoFrameCallback(stamp)};v.requestVideoFrameCallback(stamp)}
  v.addEventListener('error',()=>state.errors.push({code:v.error?.code,message:v.error?.message,time:v.currentTime}));
  const context=new (window.AudioContext||window.webkitAudioContext)();
  const source=context.createMediaElementSource(v);const analyser=context.createAnalyser();
  analyser.fftSize=512;source.connect(analyser);analyser.connect(context.destination);
  state.context=context;state.analyser=analyser;
  const button=document.createElement('button');button.id='playback-regression-start';button.textContent='Start verification';
  Object.assign(button.style,{position:'fixed',top:'0',left:'0',zIndex:'999999'});
  button.onclick=async()=>{await context.resume();await v.play();button.remove()};document.body.append(button);
 },override||null);
 await page.locator('#playback-regression-start').click();
 await page.waitForFunction(()=>window.__playbackTest.context.state==='running',null,{timeout:30000});
 const result=await page.locator('video').evaluate(async v=>{
  const state=window.__playbackTest;const began=performance.now();let lastProgress=began;
  const targets=[2,9,18,27,36,40.8,41.2,42,45,49,49.8,50.3,54,63,70,76,81,86,89.5];let target=0;
  const canvas=document.createElement('canvas');canvas.width=480;canvas.height=270;const ctx=canvas.getContext('2d');
  const field=document.createElement('canvas');field.width=118;field.height=209;const fc=field.getContext('2d',{willReadFrequently:true});
  while(!v.ended&&!v.error&&performance.now()-began<900000){
   const t=v.currentTime;
   if(performance.now()-lastProgress>15000){console.log('playback-progress '+JSON.stringify({time:t,duration:v.duration,ready:v.readyState}));lastProgress=performance.now()}
   const wave=new Float32Array(state.analyser.fftSize);state.analyser.getFloatTimeDomainData(wave);
   state.audio.push({time:t,rms:Math.sqrt(wave.reduce((sum,value)=>sum+value*value,0)/wave.length)});
   if(target<targets.length&&t>=targets[target]){ctx.drawImage(v,0,0,480,270);state.frames.push({target:targets[target],time:t,frameTime:state.frameTime,png:canvas.toDataURL('image/png')});target++}
   const frameTime=state.frameTime??t;
   // On overloaded software renderers, callback PTS can lag/lead drawImage.
   // Keep BOTH clocks inside settled gameplay, away from cut3/cut4 wipes.
   // The separate decoded-frame scan covers the entire nine-second segment.
   if(t>=42&&t<=49&&frameTime>=42&&frameTime<=49){
    fc.drawImage(v,1104,122,472,836,0,0,118,209);const pixels=fc.getImageData(15,30,85,150).data;
    let sum=0,square=0,n=0;for(let i=0;i<pixels.length;i+=4){const r=pixels[i];sum+=r;square+=r*r;n++}
    state.float.push({time:t,frameTime,std:Math.sqrt(square/n-(sum/n)**2)});
   }
   await new Promise(resolve=>setTimeout(resolve,250));
  }
  const q=v.getVideoPlaybackQuality();
  return {src:v.currentSrc,duration:v.duration,time:v.currentTime,ended:v.ended,width:v.videoWidth,height:v.videoHeight,
   muted:v.muted,volume:v.volume,playbackRate:v.playbackRate,audioContext:state.context.state,
   errors:state.errors,mediaError:v.error?{code:v.error.code,message:v.error.message}:null,
   totalFrames:q.totalVideoFrames,droppedFrames:q.droppedVideoFrames,expectedFrames:targets.length,audio:state.audio,float:state.float,frames:state.frames};
 });
 report={...report,...result};
 for(const [i,frame]of report.frames.entries()){
  fs.writeFileSync(output.replace(/\.json$/,`-frame-${String(i).padStart(2,'0')}.png`),Buffer.from(frame.png.split(',')[1],'base64'));delete frame.png;
 }
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 if(!report.ended||report.duration!==90||report.width!==1920||report.height!==1080||report.time<89.96||report.errors.length||report.mediaError)throw Error('Playback did not complete cleanly');
 if(report.muted||report.audioContext!=='running'||report.audio.filter(s=>s.rms>0.0001).length<10)throw Error('Audio playback not verified');
 if(report.frames.length!==report.expectedFrames||!report.float.length||report.float.some(s=>s.std<10))throw Error('Missing scene/blank gameplay in browser');
 console.log(JSON.stringify({engine,url,ended:report.ended,duration:report.duration,sceneFrames:report.frames.length,floatSamples:report.float.length,audioSamples:report.audio.length,errors:report.errors},null,2));
}catch(error){
 fs.writeFileSync(output.replace(/\.json$/,'.failure.json'),JSON.stringify({...report,failure:String(error)},null,2));throw error;
}finally{await browser.close()}
