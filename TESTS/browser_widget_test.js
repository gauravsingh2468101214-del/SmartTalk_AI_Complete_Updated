const {chromium}=require('/home/claude/.npm-global/lib/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox','--allow-file-access-from-files']});
 const pg=await b.newPage({viewport:{width:420,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 let html=require('fs').readFileSync('page.html','utf8').replace('<script src="bundle.js.out">','<script src="replies.js"></script><script src="bundle.js.out">');
 require('fs').writeFileSync('page2.html',html);
 await pg.goto('file:///home/claude/work/bt/page2.html');
 await pg.evaluate(()=>{const {createRoot}=window.__ReactDOMClient;createRoot(document.getElementById('root')).render(window.__React.createElement(window.__Chat))});
 await pg.waitForSelector('button[aria-label="Open SmartTalk AI chat"]');
 const ok=(n,c)=>console.log(c?'PASS':'FAIL',n);
 await pg.click('button[aria-label="Open SmartTalk AI chat"]');
 ok('chat opens',await pg.isVisible('[role=dialog]'));
 ok('greeting shown',(await pg.textContent('[role=dialog]')).includes('I am SmartTalk AI'));
 ok('online status after /health',(await pg.textContent('[role=dialog]')).includes('Online'));
 ok('4 quick questions',(await pg.$$('[role=dialog] .flex-wrap button')).length===4);
 // product question via input
 await pg.fill('input[aria-label="Your message"]','Show WA-S108 product details');
 await pg.press('input[aria-label="Your message"]','Enter');
 await pg.waitForFunction(()=>document.querySelector('[role=dialog]').textContent.includes('Display Size'),{timeout:5000});
 let t=await pg.textContent('[role=dialog]');
 ok('product spec text',t.includes('108-inch')&&t.includes('WA-S108'));
 ok('catalog page tag hidden',!/Catalog page\s*:?\s*\d+/i.test(t));
 await pg.waitForTimeout(500);ok('image rendered and loaded',await pg.evaluate(()=>{const i=[...document.querySelectorAll('[role=dialog] img')];return i.length===1&&i.every(x=>x.complete&&x.naturalWidth>0)}));
 // case study via quick-question chip? restart then use natural wording
 await pg.click('button[aria-label="Restart chat"]');
 await pg.fill('input[aria-label="Your message"]','which projects have you done?');
 await pg.press('input[aria-label="Your message"]','Enter');
 await pg.waitForFunction(()=>document.querySelector('[role=dialog]').textContent.includes('case studies'),{timeout:5000});
 const sent=await pg.evaluate(()=>window.__sent);
 ok('query rewritten for backend',sent[sent.length-1]==='all case studies');
 ok('shows 6 of 19 images first',(await pg.$$('[role=dialog] img')).length===6);
 await pg.click('text=Show all 19 images');
 ok('show-all reveals 19',(await pg.$$('[role=dialog] img')).length===19);
 await pg.waitForTimeout(1500);ok('all 19 case-study images loaded',await pg.evaluate(()=>{const i=[...document.querySelectorAll('[role=dialog] img')];return i.length===19&&i.every(x=>x.complete&&x.naturalWidth>0)}));await pg.screenshot({path:'shot.png'});
 // unreachable backend
 await pg.fill('input[aria-label="Your message"]','something unknown');
 await pg.press('input[aria-label="Your message"]','Enter');
 await pg.waitForSelector('text=not reachable');
 ok('offline message + WhatsApp link',await pg.isVisible('a[href*="wa.me"]'));
 await pg.keyboard.press('Escape');
 ok('Esc closes',!(await pg.isVisible('[role=dialog]')));
 console.log('JS errors:',errs.length?errs:'none');
 await b.close();
})().catch(e=>{console.error('TEST CRASH',e.message);process.exit(1)});
