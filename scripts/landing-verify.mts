/**
 * Visual + motion checks for the landing. System Chrome + SwiftShader WebGL.
 */
import { mkdirSync } from "node:fs";
import { chromium, type Page } from "playwright-core";

const BASE = process.env.LANDING_URL ?? "http://127.0.0.1:3000/";
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const OUT = process.env.LANDING_SHOTS ?? "/opt/cursor/artifacts";

function fail(msg: string): never {
  console.error("FAIL", msg);
  process.exit(1);
}

type Box = { x: number; y: number; width: number; height: number };

function overlap(a: Box, b: Box, pad = 0) {
  return a.x + pad < b.x + b.width && a.x + a.width - pad > b.x && a.y + pad < b.y + b.height && a.y + a.height - pad > b.y;
}

async function assertGlobeFit(page: Page, viewport: { width: number; height: number }, label: string) {
  const slot = await page.locator(".globe-slot").first().boundingBox();
  const hero = await page.locator(".landing-hero").first().boundingBox();
  const nav = await page.locator(".landing-nav").first().boundingBox();
  const headline = await page.locator("h1.landing-display").first().boundingBox();
  if (!slot) fail(`${label}: globe slot missing`);
  if (!hero) fail(`${label}: hero missing`);
  if (!nav) fail(`${label}: nav missing`);
  if (!headline) fail(`${label}: headline missing`);

  const max = viewport.width >= 1024 ? 520 : Math.round(viewport.width * 0.82);
  const min = viewport.width >= 1024 ? 400 : Math.round(viewport.width * 0.55);
  if (slot.width > max + 2 || slot.height > max + 2) {
    fail(`${label}: globe too big ${Math.round(slot.width)}x${Math.round(slot.height)} (max ${max})`);
  }
  if (slot.width < min || slot.height < min) {
    fail(`${label}: globe unexpectedly small ${Math.round(slot.width)}x${Math.round(slot.height)} (min ${min})`);
  }
  if (slot.x < 4 || slot.y < nav.y + nav.height - 2) {
    fail(`${label}: globe overlapping header or left edge ${JSON.stringify({ slot, nav })}`);
  }
  if (slot.x + slot.width > viewport.width + 2 || slot.y + slot.height > viewport.height + 8) {
    fail(`${label}: globe cropped ${JSON.stringify({ slot, viewport })}`);
  }
  if (viewport.width >= 1024 && overlap(slot, headline, 8)) {
    fail(`${label}: globe overlapping headline`);
  }

  const plane = await page.locator("[data-whoosh-plane]").first().boundingBox();
  if (plane) {
    if (plane.x + plane.width < -20 || plane.x > viewport.width + 20) {
      fail(`${label}: plane leaving the hero horizontally`);
    }
    if (plane.y + 8 < hero.y || plane.y + plane.height - 8 > hero.y + hero.height) {
      fail(`${label}: plane leaving the hero vertically ${JSON.stringify({ plane, hero })}`);
    }
  }
  console.log("globe fit", label, {
    slot: { w: Math.round(slot.width), h: Math.round(slot.height), x: Math.round(slot.x), y: Math.round(slot.y) },
  });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
      "--use-gl=angle",
      "--enable-webgl",
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(25000);
  await page.goto(BASE, { waitUntil: "domcontentloaded" });

  const gl = await page.evaluate(() => {
    const c = document.createElement("canvas");
    const ctx = c.getContext("webgl2") || c.getContext("webgl");
    if (!ctx) return { ok: false, renderer: "" };
    const ext = ctx.getExtension("WEBGL_debug_renderer_info");
    const renderer = ext ? String(ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(ctx.getParameter(ctx.RENDERER));
    return { ok: true, renderer };
  });
  if (!gl.ok) fail("WebGL unavailable");
  console.log("WebGL renderer", gl.renderer);

  await page.locator(".globe-slot").first().waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const c = document.querySelector(".globe-layer canvas") as HTMLCanvasElement | null;
    return !!c && c.width > 200 && c.height > 200;
  });
  await page.waitForTimeout(400);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("[data-whoosh-plane]").first().waitFor({ state: "attached" });
  await page.waitForFunction(() => {
    const c = document.querySelector(".globe-layer canvas") as HTMLCanvasElement | null;
    return !!c && c.width > 200 && c.height > 200;
  });

  const t0 = Date.now();
  const shots: Array<{ name: string; at: number }> = [
    { name: "hero-500ms", at: 500 },
    { name: "hero-1500ms", at: 1500 },
    { name: "hero-front", at: 2300 },
    { name: "hero-3500ms", at: 3500 },
    { name: "hero-arcs", at: 4800 },
    { name: "hero-behind", at: 6800 },
    { name: "hero-8500ms", at: 8500 },
  ];
  for (const s of shots) {
    const wait = s.at - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    const orbit = await page.locator("[data-whoosh-plane]").first().getAttribute("data-orbit");
    await assertGlobeFit(page, { width: 1440, height: 900 }, s.name);
    await page.screenshot({ path: `${OUT}/${s.name}.png` });
    console.log("shot", `${s.name}.png`, "orbit", orbit);
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  const jTop = await page.evaluate(() => {
    const el = document.getElementById("journey");
    return el ? el.getBoundingClientRect().top + window.scrollY : 0;
  });
  const jHeight = await page.evaluate(() => document.getElementById("journey")?.getBoundingClientRect().height ?? 0);
  const mapPoints = [
    { name: "map-start", y: jTop + 20 },
    { name: "map-mid", y: jTop + Math.min(jHeight * 0.4, jHeight - 900) },
    { name: "map-end", y: jTop + Math.min(jHeight * 0.68, jHeight - 780) },
  ];
  for (const p of mapPoints) {
    await page.evaluate((y) => window.scrollTo(0, y), p.y);
    await page.waitForTimeout(380);
    await page.screenshot({ path: `${OUT}/${p.name}.png` });
    console.log("shot", `${p.name}.png`, "y", Math.round(p.y));
  }

  const statsTop = await page.evaluate(() => {
    const el = document.getElementById("stats");
    return el ? el.getBoundingClientRect().top + window.scrollY : 0;
  });
  await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, statsTop - 80));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/stats.png` });
  console.log("shot stats.png");

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(120);
  const globe = page.locator(".globe-layer").first();
  const box = await globe.boundingBox();
  if (!box) fail("globe box missing");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const start = await page.evaluate(() => window.scrollY);
  const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  if (max < 400) fail(`page not tall enough (max=${max})`);
  let y = start;
  for (let i = 0; i < 40 && y < max * 0.92; i++) {
    await page.mouse.wheel(0, 1100);
    await page.waitForTimeout(30);
    y = await page.evaluate(() => window.scrollY);
  }
  if (y <= start) fail(`wheel over globe did not scroll (start=${start} end=${y})`);
  if (y < max * 0.7) fail(`wheel did not reach the bottom (y=${y} max=${max})`);
  console.log("scroll OK", { start, y, max });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(BASE, { waitUntil: "domcontentloaded" });
  await mobile.locator(".globe-slot").first().waitFor({ state: "visible" });
  await mobile.waitForTimeout(900);
  await assertGlobeFit(mobile, { width: 390, height: 844 }, "hero-390");
  await mobile.screenshot({ path: `${OUT}/hero-390.png` });
  console.log("shot hero-390.png");
  await mobile.close();

  await browser.close();
  console.log("PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
