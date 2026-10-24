/**
 * Playwright checks for the landing whoosh + native scroll.
 * Uses system Chrome via playwright-core.
 */
import { chromium } from "playwright-core";

const BASE = process.env.LANDING_URL ?? "http://127.0.0.1:3000/";
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";

function fail(msg: string): never {
  console.error("FAIL", msg);
  process.exit(1);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(20000);
  await page.goto(BASE, { waitUntil: "domcontentloaded" });

  const plane = page.locator("[data-whoosh-plane]").first();
  await plane.waitFor({ state: "attached" });
  await page.waitForFunction(() => {
    return document.querySelector("[data-whoosh-plane]")?.getAttribute("data-whoosh-state") === "done";
  });

  const info = await plane.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      x: r.x,
      y: r.y,
      right: r.right,
      bottom: r.bottom,
      w: r.width,
      h: r.height,
      opacity: Number(cs.opacity),
      transform: cs.transform,
      vw: innerWidth,
      vh: innerHeight,
    };
  });
  const off =
    info.opacity < 0.08 || info.right < 8 || info.x > info.vw - 8 || info.bottom < 8 || info.y > info.vh - 8;
  if (!off) fail(`plane still on screen after intro: ${JSON.stringify(info)}`);
  console.log("plane off-screen after intro", info);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);

  const globe = page.locator(".globe-layer").first();
  await globe.waitFor({ state: "visible" });
  const box = await globe.boundingBox();
  if (!box) fail("globe has no box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

  const start = await page.evaluate(() => window.scrollY);
  const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  if (max < 400) fail(`page is not tall enough to scroll (max=${max})`);

  let y = start;
  for (let i = 0; i < 36 && y < max * 0.92; i++) {
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(35);
    y = await page.evaluate(() => window.scrollY);
  }
  if (y <= start) fail(`scrollY did not change from ${start} with wheel over the globe (end=${y}, max=${max})`);
  if (y < max * 0.7) fail(`wheel over globe did not reach the bottom (y=${y} max=${max})`);
  console.log("scroll over globe", { start, y, max });

  await browser.close();
  console.log("PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
