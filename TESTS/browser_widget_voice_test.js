const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox']});
const pg=await b.newPage({viewport:{width:420,height:820}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text())});
await pg.addInitScript(()=>{
  window.__log={spoken:[],cancel:0,pause:0,resume:0,recLang:[]};
  const synth={speaking:false,paused:false,getVoices:()=>[{lang:'en-IN',name:'En'},{lang:'hi-IN',name:'Hi'}],
    speak(u){window.__log.spoken.push({t:u.text,lang:u.lang,vol:u.volume,voice:u.voice&&u.voice.name});synth.speaking=true;window.__last=u;},
    cancel(){window.__log.cancel++;synth.speaking=false},pause(){window.__log.pause++;synth.paused=true},resume(){window.__log.resume++;synth.paused=false}};
  Object.defineProperty(window,'speechSynthesis',{value:synth,configurable:true});
  window.SpeechSynthesisUtterance=function(t){this.text=t};
  window.SpeechRecognition=function(){const r=this;r.start=()=>{window.__log.recLang.push(r.lang);r.onstart&&r.onstart();window.__rec=r};r.stop=()=>{r.onend&&r.onend()}};
  window.__sent=[];
});
const MEDIA=[{id:'a1',kind:'audio',filename:'intro.mp3',title:'Intro Audio',size_bytes:2048},{id:'v1',kind:'video',filename:'demo.mp4',title:'Product Demo',size_bytes:3145728}];
await pg.route('http://127.0.0.1:8000/**',async route=>{
  const u=route.request().url();const h={'access-control-allow-origin':'*','access-control-allow-headers':'*'};
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:h});
  if(u.endsWith('/health'))return route.fulfill({status:200,headers:h,json:{status:'ok'}});
  if(u.includes('/media/list'))return route.fulfill({status:200,headers:h,json:{items:MEDIA}});
  if(u.includes('/media/file'))return route.fulfill({status:200,headers:{...h,'content-type':'audio/mpeg'},body:''});
  if(u.endsWith('/chat')){const q=JSON.parse(route.request().postData()).question;await pg.evaluate(q=>window.__sent.push(q),q);
    return route.fulfill({status:200,headers:h,json:{answer:'WA-S108 specs.\nDisplay Size: 108-inch. Catalog page: 26 | Brightness: 500 nits. Visit https://x.com now.',images:[],sources:[]}})}
  route.fulfill({status:404,headers:h,body:''});
});
await pg.goto('file:///tmp/bt/page.html');await pg.evaluate(()=>window.__mount());
const ok=(n,c)=>console.log(c?'PASS':'FAIL',n);
await pg.click('button[aria-label="Open SmartTalk AI chat"]');
ok('chat opens',await pg.isVisible('[role=dialog]'));
await pg.waitForTimeout(300);
ok('online',(await pg.textContent('[role=dialog]')).includes('Online'));
ok('4 quick questions',(await pg.$$('[role=dialog] .flex-wrap button')).length===4);
// 6 features present
ok('1 mic button',await pg.isVisible('button[aria-label="Speak your question"]'));
ok('3 language select with Hindi+English',(await pg.$$eval('select[aria-label="Voice language"] option',o=>o.map(x=>x.textContent))).join()==='English,हिन्दी');
for(const l of ['Pause voice','Resume voice','Stop voice','Mute voice','Open audio and video library'])ok('control: '+l,await pg.isVisible(`button[aria-label="${l}"]`));
ok('6 WhatsApp/Call/Email present',await pg.isVisible('a[href*="wa.me"]')&&await pg.isVisible('a[href^="tel:+919560966088"]')&&await pg.isVisible('a[href^="mailto:support@smartchiptree.com"]'));
// typed question (existing behaviour) -> no auto voice
await pg.fill('input[aria-label="Your message"]','Show WA-S108 product details');await pg.press('input[aria-label="Your message"]','Enter');
await pg.waitForFunction(()=>document.querySelector('[role=dialog]').textContent.includes('108-inch'));
let t=await pg.textContent('[role=dialog]');
ok('catalog page tag hidden',!/Catalog page\s*:?\s*\d+/i.test(t));
ok('typed question does not auto-speak',(await pg.evaluate(()=>window.__log.spoken.length))===0);
// 2 Listen button speaks cleaned text
await pg.click('button[aria-label="Listen to this answer"]');
let log=await pg.evaluate(()=>window.__log);
ok('2 Listen speaks',log.spoken.length>=1&&!/https?:|Catalog page|\|/.test(log.spoken.map(s=>s.t).join(' ')),JSON.stringify(log.spoken));
ok('English voice lang en-IN',log.spoken[0].lang==='en-IN'&&log.spoken[0].voice==='En');
// pause / resume / stop
await pg.click('button[aria-label="Pause voice"]');ok('4 pause',(await pg.evaluate(()=>window.__log.pause))===1);
await pg.click('button[aria-label="Resume voice"]');ok('4 resume',(await pg.evaluate(()=>window.__log.resume))===1);
await pg.click('button[aria-label="Stop voice"]');ok('4 stop',await pg.isVisible('text=Voice stopped'));
// mute
await pg.click('button[aria-label="Mute voice"]');ok('4 mute toggles',await pg.isVisible('button[aria-label="Unmute voice"]'));
await pg.click('button[aria-label="Listen to this answer"]');
ok('muted playback volume 0',(await pg.evaluate(()=>window.__log.spoken.at(-1).vol))===0);
await pg.click('button[aria-label="Unmute voice"]');
// 3 Hindi
await pg.selectOption('select[aria-label="Voice language"]','hi-IN');
await pg.click('button[aria-label="Listen to this answer"]');
log=await pg.evaluate(()=>window.__log);ok('3 Hindi voice hi-IN',log.spoken.at(-1).lang==='hi-IN'&&log.spoken.at(-1).voice==='Hi');
// 1 mic: Hindi lang, result -> auto send -> auto speak
await pg.click('button[aria-label="Speak your question"]');
ok('mic listening state',await pg.isVisible('button[aria-label="Stop listening"]'));
ok('mic uses hi-IN',(await pg.evaluate(()=>window.__log.recLang.at(-1)))==='hi-IN');
const before=(await pg.evaluate(()=>window.__log.spoken.length));
await pg.evaluate(()=>window.__rec.onresult({results:[[{transcript:'Compare WA-S108 and WA-S135'}]]}));
await pg.waitForFunction(()=>window.__sent.includes('Compare WA-S108 and WA-S135'));
await pg.waitForFunction(b=>window.__log.spoken.length>b,before);
ok('1 mic question sent + answer spoken',true);
await pg.evaluate(()=>window.__rec.onend());
// 6 contact via chat
await pg.fill('input[aria-label="Your message"]','I want to call your team on whatsapp');await pg.press('input[aria-label="Your message"]','Enter');
await pg.waitForSelector('text=reach our team directly');
ok('6 contact intent shows buttons in chat',(await pg.$$('[role=dialog] a[href*="wa.me"]')).length>=2);
ok('contact intent not sent to backend',!(await pg.evaluate(()=>window.__sent)).some(q=>/whatsapp/i.test(q)));
// 5 library
await pg.click('button[aria-label="Open audio and video library"]');
await pg.waitForSelector('text=Intro Audio');
ok('5 library lists audio+video',await pg.isVisible('text=Product Demo')&&(await pg.$$('[role=dialog] audio')).length===1&&(await pg.$$('[role=dialog] video')).length===1);
await pg.selectOption('select[aria-label="Media type"]','video');ok('5 filter video',(await pg.$$('[role=dialog] audio')).length===0);
await pg.selectOption('select[aria-label="Media type"]','all');await pg.fill('input[aria-label="Search media library"]','intro');ok('5 search',(await pg.$$('[role=dialog] video')).length===0);
await pg.screenshot({path:'lib.png'});
await pg.click('button[aria-label="Back to chat"]');ok('back to chat keeps messages',await pg.isVisible('text=108-inch'));
// existing: restart, offline, esc
await pg.click('button[aria-label="Restart chat"]');ok('restart',(await pg.$$('[role=dialog] .flex-wrap button')).length===4);
await pg.screenshot({path:'chat.png'});
await pg.keyboard.press('Escape');ok('Esc closes',!(await pg.isVisible('[role=dialog]')));
ok('voice stopped on close',(await pg.evaluate(()=>window.__log.cancel))>0);
await pg.evaluate(()=>window.dispatchEvent(new CustomEvent('smarttalk-open',{detail:{q:'Show WA-S108 product details'}})));
await pg.waitForSelector('[role=dialog]');await pg.waitForFunction(()=>window.__sent.filter(q=>q==='Show WA-S108 product details').length>=2);
ok('site search opens chatbot + sends question',true);
ok('input named SmartTalk Chatbot',(await pg.getAttribute('input[aria-label="Your message"]','placeholder')).includes('SmartTalk Chatbot'));
console.log('JS errors:',errs.length?errs:'none');
await b.close();
})().catch(e=>{console.error('TEST CRASH',e.message);process.exit(1)});
