import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, executablePath: '/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome', args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors=[]; page.on('console',m=>{if(m.type()==='error' && !m.text().includes('favicon') && !m.text().includes('synchronously unmount')) errors.push(m.text().slice(0,200));}); page.on('pageerror',e=>errors.push('PAGEERROR: '+e.message.slice(0,200)));
await page.goto('http://localhost:3002', { waitUntil:'domcontentloaded', timeout:180000 });
await page.waitForFunction(()=>!!window.__worldopsStore && !!window.__worldops, null, {timeout:180000});
await page.waitForSelector('canvas', {timeout:120000});
await page.waitForTimeout(4000);
await page.evaluate(()=>{ const o=window.__worldops; if(o){o.gl.shadowMap.enabled=false;o.gl.setPixelRatio(1);o.gl.setSize(window.innerWidth,window.innerHeight,false);} document.querySelectorAll('nextjs-portal').forEach(e=>e.remove()); });
await page.waitForTimeout(1500);
await page.screenshot({path:'qa-artifacts/70-welcome.png', timeout:180000});
console.log('welcome', await page.locator('.studio-root').getAttribute('data-view'));
// open example
await page.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(el=>el.textContent?.includes('Open Rising Tide')); if(b instanceof HTMLElement) b.click(); });
await page.waitForTimeout(2500);
await page.screenshot({path:'qa-artifacts/71-build.png', timeout:180000});
console.log('build', await page.locator('.studio-root').evaluate(el=>({...el.dataset})));
// layers tab and select a route
await page.evaluate(()=>{ const b=[...document.querySelectorAll('.studio-left-tabs button')].find(el=>el.textContent?.includes('Layers')); if(b instanceof HTMLElement) b.click(); });
await page.waitForTimeout(700);
const route = page.locator('.studio-layer-row').filter({hasText:'Old Causeway'}).first();
console.log('route count', await route.count());
if (await route.count()) { await route.evaluate(el=>el.click()); await page.waitForTimeout(1200); }
await page.screenshot({path:'qa-artifacts/72-inspector.png', timeout:180000});
// run mode
await page.evaluate(()=>{ const b=[...document.querySelectorAll('.studio-mode-switch button')].find(el=>el.textContent==='Run'); if(b instanceof HTMLElement) b.click(); });
await page.waitForTimeout(2000);
await page.screenshot({path:'qa-artifacts/73-run.png', timeout:180000});
console.log('run', await page.locator('.studio-root').evaluate(el=>({...el.dataset})));
console.log('errors', errors.slice(0,8));
await browser.close();
