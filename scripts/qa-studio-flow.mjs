import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, executablePath: '/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome', args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors=[]; page.on('console',m=>{if(m.type()==='error' && !m.text().includes('favicon') && !m.text().includes('synchronously unmount')) errors.push(m.text().slice(0,200));}); page.on('pageerror',e=>errors.push('PAGEERROR: '+e.message.slice(0,200)));
const data=()=>page.locator('.studio-root').evaluate(el=>({...el.dataset}));
const store=()=>page.evaluate(()=>({view:window.__worldopsStore.getState().view, versions:window.__worldopsStore.getState().versions.length, current:window.__worldopsStore.getState().currentVersionId, mode:window.__worldopsStore.getState().generationMode, source:window.__worldopsStore.getState().source, summary:window.__worldopsStore.getState().lastEditSummary, chat:window.__worldopsStore.getState().editError, hasPlan:!!window.__worldopsStore.getState().plan}));
await page.goto('http://localhost:3002', { waitUntil:'domcontentloaded', timeout:180000 });
await page.waitForFunction(()=>!!window.__worldopsStore && !!window.__worldops, null, {timeout:180000});
await page.waitForSelector('canvas', {timeout:120000});
await page.waitForTimeout(4000);
await page.evaluate(()=>{const o=window.__worldops;if(o){o.gl.shadowMap.enabled=false;o.gl.setPixelRatio(1);o.gl.setSize(window.innerWidth,window.innerHeight,false);}document.querySelectorAll('nextjs-portal').forEach(e=>e.remove());});
await page.waitForTimeout(1200);
await page.screenshot({path:'qa-artifacts/80-welcome.png',timeout:180000});
console.log('welcome', await data(), await store());

// 1. Live generation from welcome
const prompt='Create a compact fishing village with four houses, a clinic, two shelters, eight residents, a canal and one bridge. A flood is approaching from the east. Make evacuation the objective.';
await page.locator('.studio-composer textarea').fill(prompt);
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(el=>el.textContent?.includes('Generate world'));if(b instanceof HTMLElement)b.click();});
console.log('generation started');
await page.waitForFunction(()=>window.__worldopsStore.getState().view==='build', null, {timeout:180000});
await page.waitForTimeout(3000);
console.log('ai build', await data(), await store());
await page.screenshot({path:'qa-artifacts/81-ai-build.png',timeout:180000});

// 2. AI edit via Agent
await page.waitForTimeout(800);
await page.locator('.studio-agent-prompt textarea').fill('Add a second shelter on the west side and reroute residents to it.');
const versionsBefore = (await store()).versions;
await page.evaluate(()=>{const b=[...document.querySelectorAll('.studio-agent-prompt button')].find(el=>el.textContent?.trim().startsWith('Apply'));if(b instanceof HTMLElement)b.click();});
await page.waitForFunction((before)=>window.__worldopsStore.getState().versions.length>before, versionsBefore, {timeout:180000});
await page.waitForTimeout(1800);
console.log('ai edit', await store());
await page.screenshot({path:'qa-artifacts/82-ai-edit.png',timeout:180000});

// 3. Restore the example v1
await page.evaluate(()=>{const v=[...document.querySelectorAll('.studio-version')].find(el=>el.textContent?.includes('v1'));if(v instanceof HTMLElement)v.click();});
await page.waitForTimeout(1500);
console.log('restored', await data(), await store());
await page.screenshot({path:'qa-artifacts/83-restored.png',timeout:180000});

// 4. Run the example, advance to danger, open risk drawer
await page.evaluate(()=>{const b=[...document.querySelectorAll('.studio-mode-switch button')].find(el=>el.textContent==='Run');if(b instanceof HTMLElement)b.click();});
await page.waitForTimeout(1200);
await page.evaluate(()=>{const s=window.__worldopsStore;for(let i=0;i<46;i++)s.getState().tick();s.getState().pause();});
await page.waitForTimeout(1600);
console.log('danger', await data());
await page.evaluate(()=>{const b=[...document.querySelectorAll('.studio-run-metric')].find(el=>el.textContent?.includes('at risk'));if(b instanceof HTMLElement)b.click();});
await page.waitForTimeout(900);
console.log('risk drawer', await page.locator('.studio-run-drawer').innerText().catch(()=>''));
await page.screenshot({path:'qa-artifacts/84-run-risk.png',timeout:180000});
// dispatch available skiffs
await page.evaluate(()=>{const b=[...document.querySelectorAll('.studio-run-drawer .studio-drawer-row button')].filter(el=>el.textContent?.includes('Skiff'));for(const x of b)if(x instanceof HTMLElement&&!x.disabled)x.click();});
await page.waitForTimeout(1000);
await page.evaluate(()=>{const s=window.__worldopsStore;s.getState().start();for(let i=0;i<150;i++)s.getState().tick();});
await page.waitForFunction(()=>window.__worldopsStore.getState().sim.status==='success', null, {timeout:60000});
await page.waitForTimeout(1800);
console.log('success', await data(), await store());
await page.screenshot({path:'qa-artifacts/85-run-success.png',timeout:180000});

// 5. Back to Build, place an object
await page.evaluate(()=>{const b=[...document.querySelectorAll('.studio-mode-switch button')].find(el=>el.textContent==='Build');if(b instanceof HTMLElement)b.click();});
await page.waitForTimeout(900);
const objectsBefore = Number((await data()).objects);
await page.evaluate(()=>{const b=document.querySelectorAll('.studio-toolrail .studio-tool')[1];if(b instanceof HTMLElement)b.click();});
await page.waitForTimeout(400);
await page.evaluate(()=>{const b=[...document.querySelectorAll('.studio-tool-flyout button')].find(el=>el.textContent?.includes('House'));if(b instanceof HTMLElement)b.click();});
await page.waitForTimeout(400);
for (const [x,y] of [[900,480],[820,420],[760,560],[1000,430],[680,500]]) {
  await page.mouse.click(x,y); await page.waitForTimeout(700);
  if (Number((await data()).objects)>objectsBefore) break;
}
await page.keyboard.press('Escape');
await page.waitForTimeout(1000);
console.log('placed', objectsBefore, '->', (await data()).objects, await store());
await page.screenshot({path:'qa-artifacts/86-placed.png',timeout:180000});
console.log('errors', errors.slice(0,10));
await browser.close();
