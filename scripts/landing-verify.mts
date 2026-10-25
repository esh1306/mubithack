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

async function nextIssueText(page: Page) {
  return page.evaluate(() => {
    const portals = [...document.querySelectorAll("nextjs-portal")];
    for (const p of portals) {
      const t = p.shadowRoot?.textContent ?? "";
      if (/\d+\s+Issue/i.test(t) || /Uncaught Error|code: 1/i.test(t)) return t.replace(/\s+/g, " ").slice(0, 400);
    }
    return "";
  });
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

  const max = viewport.width >= 1024 ? 640 : Math.round(viewport.width * 0.82);
  const min = viewport.width >= 1024 ? 560 : Math.round(viewport.width * 0.55);
  if (slot.width > max + 2 || slot.height > max + 2) {
    fail(`${label}: globe too big ${Math.round(slot.width)}x${Math.round(slot.height)} (max ${max})`);
  }
  if (slot.width < min || slot.height < min) {
    fail(`${label}: globe unexpectedly small ${Math.round(slot.width)}x${Math.round(slot.height)} (min ${min})`);
  }
  if (slot.x < 4 || slot.y < nav.y + nav.height - 2) {
    fail(`${label}: globe overlapping header or left edge`);
  }
  if (slot.x + slot.width > viewport.width + 2 || slot.y + slot.height > viewport.height + 8) {
    fail(`${label}: globe cropped`);
  }
  if (viewport.width >= 1024 && overlap(slot, headline, 8)) {
    fail(`${label}: globe overlapping headline`);
  }
  if (viewport.width >= 1024 && slot.x > 920) {
    fail(`${label}: globe still parked on the far right (x=${Math.round(slot.x)})`);
  }
  console.log("globe fit", label, {
    slot: { w: Math.round(slot.width), h: Math.round(slot.height), x: Math.round(slot.x), y: Math.round(slot.y) },
  });
}

async function waitOrbit(page: Page, want: "front" | "behind") {
  await page.waitForFunction(
    (w) => {
      const el = document.querySelector("[data-whoosh-plane]") as HTMLElement | null;
      if (el?.getAttribute("data-orbit") !== w) return false;
      const width = el.getBoundingClientRect().width;
      return w === "front" ? width >= 124 : width <= 96;
    },
    want,
    { timeout: 16000 },
  );
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
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
  page.on("pageerror", (e) => errors.push(e.message));
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
  await page.waitForTimeout(1200);

  const issue = await nextIssueText(page);
  if (issue) fail(`Next.js issue overlay still present: ${issue}`);
  const code1 = errors.filter((m) => /code:\s*1|H3Library|operation failed/i.test(m));
  if (code1.length) fail(`repeating runtime error still throwing: ${code1[0]} (x${code1.length})`);
  console.log("no issue badge, pageerrors", errors.length);

  const copy = await page.locator(".landing-lede").first().innerText();
  if (!/You sign it/i.test(copy) || !/3 years/i.test(copy)) {
    fail(`subtitle missing the reclaim/sign copy: ${copy}`);
  }
  const chips = await page.locator(".landing-chips li").count();
  if (chips < 3) fail(`expected 3 honesty chips, got ${chips}`);

  await assertGlobeFit(page, { width: 1440, height: 900 }, "hero");
  await page.screenshot({ path: `${OUT}/hero-500ms.png` });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/hero-arcs.png` });
  console.log("shot hero-500ms.png hero-arcs.png");

  await waitOrbit(page, "front");
  await page.waitForTimeout(120);
  const frontBox = await page.locator("[data-whoosh-plane]").first().boundingBox();
  await page.screenshot({ path: `${OUT}/hero-front.png` });
  console.log("shot hero-front.png", frontBox);

  await waitOrbit(page, "behind");
  await page.waitForTimeout(180);
  const behindBox = await page.locator("[data-whoosh-plane]").first().boundingBox();
  await page.screenshot({ path: `${OUT}/hero-behind.png` });
  console.log("shot hero-behind.png", behindBox);

  if (!frontBox || !behindBox) fail("plane boxes missing");
  if (frontBox.width < 110) fail(`front plane too small (${Math.round(frontBox.width)}px, want ~120-150)`);
  if (frontBox.width <= behindBox.width + 8) {
    fail(`front/behind inverted (front ${Math.round(frontBox.width)} behind ${Math.round(behindBox.width)})`);
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(80);
  const globe = page.locator(".globe-layer").first();
  const box = await globe.boundingBox();
  if (!box) fail("globe box missing");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

  const start = await page.evaluate(() => window.scrollY);
  let y = start;
  for (let i = 0; i < 18 && y < 1100; i++) {
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(40);
    y = await page.evaluate(() => window.scrollY);
  }
  await page.waitForTimeout(420);
  const mid = await page.evaluate(() => {
    const clip = document.querySelector(".scroll-clip") as HTMLElement | null;
    const pins = [...document.querySelectorAll(".paper-pin")];
    return {
      y: window.scrollY,
      clip: clip?.style.width ?? "",
      pins: pins.filter((p) => Number.parseFloat((p as HTMLElement).style.opacity || "0") > 0.2).length,
    };
  });
  await page.screenshot({ path: `${OUT}/map-mid.png` });
  console.log("shot map-mid.png", mid);
  if (y <= start) fail(`wheel did not scroll the parchment (start=${start} end=${y})`);
  if (mid.clip && Number.parseFloat(mid.clip) < 20) fail(`map did not unroll mid-way (width=${mid.clip})`);

  for (let i = 0; i < 24 && y < 2400; i++) {
    await page.mouse.wheel(0, 280);
    await page.waitForTimeout(40);
    y = await page.evaluate(() => window.scrollY);
  }
  await page.waitForTimeout(420);
  const end = await page.evaluate(() => {
    const clip = document.querySelector(".scroll-clip") as HTMLElement | null;
    const pins = [...document.querySelectorAll(".paper-pin")];
    return {
      y: window.scrollY,
      clip: clip?.style.width ?? "",
      pins: pins.filter((p) => Number.parseFloat((p as HTMLElement).style.opacity || "0") > 0.2).length,
    };
  });
  await page.screenshot({ path: `${OUT}/map-end.png` });
  console.log("shot map-end.png", end);
  if (end.pins < 3) fail(`map end should show several pins (got ${end.pins})`);

  const statsTop = await page.evaluate(() => {
    const el = document.getElementById("stats");
    return el ? el.getBoundingClientRect().top + window.scrollY : 0;
  });
  await page.evaluate((yy) => window.scrollTo(0, yy), Math.max(0, statsTop - 80));
  await page.waitForTimeout(280);
  await page.screenshot({ path: `${OUT}/stats.png` });
  console.log("shot stats.png");

  await page.evaluate(() => window.scrollTo(0, 0));
  const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  y = 0;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 40 && y < max * 0.92; i++) {
    await page.mouse.wheel(0, 1100);
    await page.waitForTimeout(24);
    y = await page.evaluate(() => window.scrollY);
  }
  if (y < max * 0.7) fail(`wheel did not reach the bottom (y=${y} max=${max})`);
  console.log("scroll OK", { y, max, errors: errors.length });

  if (errors.some((m) => /code:\s*1|H3Library|operation failed/i.test(m))) {
    fail(`error returned during scroll: ${errors.join(" | ")}`);
  }

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
