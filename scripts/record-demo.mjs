import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.DEMO_URL || "http://localhost:3002";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;
const outDir = path.resolve("demo-artifacts");
fs.mkdirSync(outDir, { recursive: true });
const rawName = `timelapse-${Date.now()}.webm`;

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
  recordVideo: { dir: outDir, size: { width: 1280, height: 720 } },
});
const page = await context.newPage();
const startedAt = Date.now();
let readyOffset = 0;
let errorMessage = null;

async function caption(text) {
  await page.evaluate((value) => {
    let el = document.getElementById("demo-caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-caption";
      document.body.appendChild(el);
    }
    el.textContent = value;
    el.style.opacity = "1";
  }, text);
  await page.waitForTimeout(2400);
}

async function click(selector) {
  const ok = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el instanceof HTMLElement) { el.click(); return true; }
    return false;
  }, selector);
  if (!ok) throw new Error(`Cannot click ${selector}`);
}

async function clickButtonText(text) {
  const ok = await page.evaluate((value) => {
    const el = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes(value));
    if (el instanceof HTMLElement) { el.click(); return true; }
    return false;
  }, text);
  if (!ok) throw new Error(`Cannot click button ${text}`);
}

async function tickTo(target, max = 140) {
  await page.evaluate(({ goal, cap }) => {
    const store = window.__worldopsStore;
    for (let index = 0; index < cap; index += 1) {
      const state = store.getState();
      if (state.sim.tick >= goal) break;
      state.tick();
    }
  }, { goal: target, cap: max });
}

async function waitDataset(key, predicate, timeout = 60000) {
  await page.waitForFunction(
    ({ k, code }) => {
      const value = Number(document.querySelector(".app-shell")?.dataset[k] ?? "0");
      return Function("v", `return ${code}`)(value);
    },
    { k: key, code: predicate },
    { timeout },
  );
}

async function main() {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForFunction(() => Boolean(window.__worldopsStore && window.__worldops), null, { timeout: 180000 });
  await page.waitForSelector("canvas", { timeout: 120000 });
  await page.waitForTimeout(2200);
  readyOffset = (Date.now() - startedAt) / 1000;

  await page.addStyleTag({ content: `
    #demo-caption{position:fixed;left:16px;bottom:16px;z-index:99999;width:340px;padding:12px 15px 13px;border-radius:11px;border:1px solid rgba(255,180,92,.38);background:rgba(5,16,18,.93);color:#f7ead6;font-family:var(--font-display,system-ui,sans-serif);font-size:14px;line-height:1.45;box-shadow:0 18px 44px rgba(0,0,0,.45);opacity:0;transition:opacity .35s ease;pointer-events:none;backdrop-filter:blur(12px)}
    #demo-caption::before{content:"WORLDOPS DEMO · TIME-LAPSE";display:block;margin-bottom:5px;font-family:var(--font-mono,monospace);font-size:8px;letter-spacing:.16em;color:#ffb45c}
    nextjs-portal{display:none!important}
  `});
  await page.evaluate(() => {
    const renderer = window.__worldops;
    if (renderer) {
      renderer.gl.shadowMap.enabled = false;
      renderer.gl.setPixelRatio(1);
      renderer.gl.setSize(window.innerWidth, window.innerHeight, false);
    }
  });

  await caption("A prompt becomes a playable world: 12 residents, one causeway, a flood from the east.");
  await click('button[aria-label="Start simulation"]');
  await page.waitForTimeout(1200);
  await click('button[title="2× simulation speed"]');
  await page.waitForTimeout(1800);

  await caption("TIME-LAPSE — residents re-path while the causeway disappears under the flood.");
  await tickTo(46);
  await page.waitForTimeout(800);
  await click('button[aria-label="Pause simulation"]');
  await waitDataset("danger", "v >= 2", 30000);
  await page.waitForTimeout(1800);

  await caption("Two slow residents are stranded. The inspector shows their real status.");
  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll(".risk-row button")].filter((button) => button.textContent?.includes("Skiff"));
    for (const button of buttons) if (button instanceof HTMLElement && !button.disabled) button.click();
  });
  await page.waitForTimeout(1200);
  await click('button[aria-label="Resume simulation"]');
  await tickTo(110);
  await page.waitForFunction(() => document.querySelector(".app-shell")?.dataset.status === "success", null, { timeout: 60000 });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: "docs/success.png", timeout: 120000 });
  await caption("12/12 safe. Every outcome number comes from simulation state, not the model.");

  await click('button[aria-label="Run simulation again"]');
  await page.waitForTimeout(1500);
  await caption("Now edit the existing world. Unchanged objects keep their IDs and positions.");
  await page.evaluate(() => {
    const tab = [...document.querySelectorAll('[role="tab"]')].find((el) => el.textContent?.includes("Edit live world"));
    if (tab instanceof HTMLElement) tab.click();
  });
  await page.waitForTimeout(600);
  await page.locator("#edit-prompt").fill("Add a second shelter to the west and reroute residents", { timeout: 60000 });
  await clickButtonText("Apply edit");
  await page.waitForSelector(".applied-box", { timeout: 120000 });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: "docs/edit.png", timeout: 120000 });
  await caption("A validated patch adds one shelter and reroutes all residents. 24 → 25 objects.");

  await page.evaluate(() => {
    const button = document.querySelector('button[aria-label="Inspect Old Causeway"]');
    if (button instanceof HTMLElement) button.click();
  });
  await page.waitForTimeout(1800);
  await caption("Select the causeway to fortify it, close it, or reopen it.");
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((el) => el.textContent?.includes("Deploy barrier"));
    if (button instanceof HTMLElement) button.click();
  });
  await page.waitForTimeout(1600);
  await caption("Prompt a world. Change its fate. WorldOps AI.");
  await page.waitForTimeout(2000);
}

try {
  await main();
} catch (error) {
  errorMessage = error instanceof Error ? error.message : String(error);
  console.error("TIMELAPSE ERROR:", errorMessage);
}

const video = page.video();
await context.close();
let videoPath = null;
try { videoPath = await video?.path(); } catch {}
await browser.close();

if (videoPath) {
  const raw = path.join(outDir, rawName);
  try { fs.renameSync(videoPath, raw); } catch {}
  const trimmed = path.join(outDir, "worldops-demo-timelapse.mp4");
  const trimStart = Math.max(0, readyOffset - 1.2);
  console.log(`raw: ${raw}`);
  console.log(`ready offset: ${readyOffset.toFixed(1)}; trim ${trimStart.toFixed(1)}`);
  execFileSync("ffmpeg", ["-y", "-ss", trimStart.toFixed(2), "-i", raw, "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p", trimmed], { stdio: "inherit" });
  console.log(`trimmed: ${trimmed}`);
}
if (errorMessage) process.exitCode = 1;
