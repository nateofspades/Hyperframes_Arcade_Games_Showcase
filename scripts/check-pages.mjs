import {chromium, request} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Run against a separately started site server or the case-sensitive Pages URL.
// One browser, one page at a time: do not overlap this with HyperFrames capture.
const url = process.argv[2] || 'http://127.0.0.1:3019/';
const label = (process.argv[3] || 'local').replace(/[^a-zA-Z0-9_-]/g, '-');
const expectedSource = fs.readFileSync(new URL('../site/index.html',import.meta.url),'utf8').match(/<source src="([^"]+)"/)[1];
const viewports = [
  {width:1920,height:1080}, {width:1366,height:768},
  {width:768,height:1024}, {width:390,height:844}, {width:320,height:568},
];
const games = [
  ['4 Block Theory','4_Block_Theory_Game','block','Rotate falling shapes, stack strategically, and clear complete rows.'],
  ['Chromatic Cure','Chromatic_Cure_Game','chromatic','Drop and match colorful pieces, trigger chain reactions, and clear the board.'],
  ['Rally Reactor','Rally_Reactor_Game','rally','Face a computer opponent or a friend in fast-paced paddle rallies.'],
  ['Orb Onslaught','Orb_Onslaught_Game','orb','Dodge bouncing orbs and split them with upward-firing projectiles.'],
  ['Float Tweet Bounce','Float_Tweet_Bounce_Game','float','Keep your glider airborne and navigate through obstacles.'],
  ['Serpent Supper','Serpent_Supper_Game','serpent','Collect food, grow longer, and avoid colliding with yourself.'],
  ['BrikaVolt','BrikaVolt_Game','brika','Smash bricks, collect power-ups, and clear increasingly challenging levels.'],
  ['Aim Alley Arcade','Aim_Alley_Arcade_Game','aim','Test your speed and accuracy across 15 distinct shooting mini-games.'],
];
const cyan = 'rgb(64, 236, 236)';
const near = (actual, expected, message, tolerance=.15) =>
  assert.ok(Math.abs(actual-expected)<=tolerance, `${message}: ${actual} != ${expected}`);
fs.mkdirSync('evidence/pages', {recursive:true});
const browser = await chromium.launch({
  headless:true,
  ...(process.env.ARCADE_CHROME_PATH ? {executablePath:process.env.ARCADE_CHROME_PATH} : {}),
  args:['--no-sandbox','--autoplay-policy=no-user-gesture-required'],
});
const results = [];
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({viewport});
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const errors = [], cancellations = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => {if (m.type()==='error') errors.push(m.text());});
    page.on('response', r => {if (r.status()>=400) errors.push(`${r.status()} ${r.url()}`);});
    page.on('requestfailed', r => {
      const message = `${r.failure()?.errorText} ${r.url()}`;
      // Chromium may cancel a superseded range request; playback is separately gated.
      if (r.resourceType()==='media' && r.failure()?.errorText==='net::ERR_ABORTED') cancellations.push(message);
      else errors.push(message);
    });
    try {
      const response = await page.goto(url, {waitUntil:'domcontentloaded'});
      assert.equal(response.status(),200);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.evaluate(() => document.fonts.check('900 128px "Archivo Black"')),true);
      const title = await page.locator('#title').evaluate(h => {
        const parent = h.getBoundingClientRect();
        return {
          width:parent.width, height:parent.height,
          parts:[...h.children].map(el => {
            const r=el.getBoundingClientRect(), s=getComputedStyle(el);
            return {text:el.textContent.trim(),x:r.x-parent.x,y:r.y-parent.y,
              width:r.width,height:r.height,fontSize:parseFloat(s.fontSize),
              tracking:parseFloat(s.letterSpacing),lineHeight:parseFloat(s.lineHeight),
              family:s.fontFamily,weight:s.fontWeight,color:s.color};
          }),
        };
      });
      const scale = title.width/1630;
      near(title.height,335*scale,'title crop height');
      const specs = [
        ['8',0,0,310,cyan],
        ['ARCADE GAMES',295,45,128,'rgb(244, 247, 255)'],
        ['ONE COLLECTION',302,210,89,'rgb(169, 150, 255)'],
      ];
      assert.equal(title.parts.length,3);
      title.parts.forEach((part,i) => {
        const [text,x,y,size,color] = specs[i];
        assert.equal(part.text,text);
        near(part.x,x*scale,`${text} x`); near(part.y,y*scale,`${text} y`);
        near(part.fontSize,size*scale,`${text} font size`);
        near(part.tracking,-4*scale,`${text} tracking`);
        near(part.lineHeight,size*scale*1.08,`${text} line height`);
        assert.ok(part.family.startsWith('"Archivo Black"'));
        assert.equal(part.weight,'900'); assert.equal(part.color,color);
        assert.ok(part.x>=-.1 && part.x+part.width<=title.width+.5,`${text} stays inside title`);
        assert.ok(part.y>=-.1 && part.y+part.height<=title.height+.5,`${text} fits vertically`);
      });
      assert.equal(await page.locator('.game small').count(),0);
      assert.equal(await page.locator('.game').count(),8);
      for (const [i,[name,repo,image,description]] of games.entries()) {
        const card = page.locator('.game').nth(i);
        assert.equal(await card.getAttribute('href'),`https://nateofspades.github.io/${repo}/`);
        assert.equal(await card.locator('h3').textContent(),name);
        assert.equal(await card.locator('p').textContent(),description);
        assert.equal(await card.locator('img').getAttribute('src'),`./media/${image}.jpg`);
        assert.equal(await card.locator('.play').textContent(),'Play Game ↗');
        await card.scrollIntoViewIfNeeded();
        await card.locator('img').evaluate(img => img.decode());
      }
      const layout = await page.evaluate(() => {
        const grid = document.querySelector('.grid');
        return {
          overflow:document.documentElement.scrollWidth>innerWidth,
          columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,
          badImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),
          accents:[...document.querySelectorAll('.brand span,.section-title h2,.game h3,.play')].map(e=>getComputedStyle(e).color),
          buttons:[...document.querySelectorAll('.play')].map(e=>({border:getComputedStyle(e).borderTopColor,radius:getComputedStyle(e).borderRadius})),
          cards:[...document.querySelectorAll('.game')].map(e=>({radius:getComputedStyle(e).borderRadius,display:getComputedStyle(e).display})),
          images:[...document.querySelectorAll('.game img')].map(e=>{const r=e.getBoundingClientRect();return {ratio:r.width/r.height,fit:getComputedStyle(e).objectFit};}),
        };
      });
      assert.equal(layout.overflow,false); assert.deepEqual(layout.badImages,[]);
      assert.equal(layout.columns,viewport.width>900?4:viewport.width>520?2:1);
      assert.ok(layout.accents.every(c=>c===cyan));
      assert.ok(layout.buttons.every(b=>b.border===cyan&&b.radius==='5px'));
      assert.ok(layout.cards.every(c=>c.radius==='8px'&&c.display==='flex'));
      for (const image of layout.images) {near(image.ratio,16/9,'card image ratio',.02);assert.equal(image.fit,'contain');}
      const nav = await page.locator('nav a').evaluateAll(links => links.map(a=>a.getAttribute('href')));
      assert.deepEqual(nav,['#showcase','#games','https://github.com/nateofspades/Hyperframes_Arcade_Games_Showcase']);
      await page.locator('nav a[href="#games"]').click();
      assert.equal(new URL(page.url()).hash,'#games');
      await page.locator('nav a[href="#showcase"]').click();
      assert.equal(new URL(page.url()).hash,'#showcase');
      const info = await page.locator('video').evaluate(v => ({
        controls:v.controls,autoplay:v.autoplay,inline:v.playsInline,preload:v.preload,
        source:v.querySelector('source').getAttribute('src'),poster:v.getAttribute('poster'),
      }));
      assert.deepEqual(info,{controls:true,autoplay:false,inline:true,preload:'metadata',source:expectedSource,poster:'./media/poster.jpg'});
      // Decode the real poster and font, not only a successful stylesheet response.
      await page.evaluate(async () => {
        const poster = new Image();poster.src=document.querySelector('video').poster;await poster.decode();
        const faces=await document.fonts.load('900 128px "Archivo Black"');
        if (!faces.length || faces.some(f=>f.status!=='loaded')) throw new Error('Archivo Black not loaded');
      });
      await page.waitForFunction(()=>document.querySelector('video').readyState>=2,null,{timeout:60000});
      const media = await page.locator('video').evaluate(async v => {
        v.muted=true;await v.play();
        return {duration:v.duration,width:v.videoWidth,height:v.videoHeight};
      });
      assert.equal(media.width,1920);assert.equal(media.height,1080);near(media.duration,90,'duration',1/30);
      await page.waitForFunction(()=>{const v=document.querySelector('video');return !v.paused&&v.currentTime>.5&&v.getVideoPlaybackQuality().totalVideoFrames>0;});
      await page.locator('video').evaluate(v=>v.pause());
      const pausedAt=await page.locator('video').evaluate(v=>v.currentTime);
      await page.waitForTimeout(150);
      assert.equal(await page.locator('video').evaluate(v=>v.paused),true);
      near(await page.locator('video').evaluate(v=>v.currentTime),pausedAt,'pause holds time',.05);
      await page.locator('video').evaluate(v=>{v.currentTime=36;});
      await page.waitForFunction(()=>{const v=document.querySelector('video');return !v.seeking&&v.readyState>=2&&Math.abs(v.currentTime-36)<.2;});
      assert.equal(await page.locator('video').evaluate(v=>v.error),null);
      await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
      await page.screenshot({path:`evidence/pages/${label}-${viewport.width}x${viewport.height}.png`,fullPage:true});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.deepEqual(errors,[]);
      results.push({viewport,title,layout,media,playback:'decoded and advanced',pause:'held',seek:36,errors,cancellations});
      console.log(`PASS ${viewport.width}x${viewport.height}`);
    } finally {await context.close();}
  }
  // HTTP reachability is separate from (and does not claim) testing gameplay.
  const links = [];
  const http = await request.newContext();
  try {
    for (const [,repo] of games) {
      const target=`https://nateofspades.github.io/${repo}/`;
      const response=await http.get(target,{timeout:30000});
      assert.equal(response.status(),200,`game destination: ${target}`);
      links.push({url:target,status:response.status()});await response.dispose();
    }
  } finally {await http.dispose();}
  const report={url,results,links};
  fs.writeFileSync(`evidence/pages/${label}-report.json`,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({url,viewports:results.length,games:games.length,playback:'passed at every viewport',links},null,2));
} finally {await browser.close();}
