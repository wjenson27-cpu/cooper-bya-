import { test, expect } from "@playwright/test";
import fs from "fs";

const OUT = "/opt/cursor/artifacts/cooper-backyard";
const PORTRAIT = { width: 390, height: 844 };
const LANDSCAPE = { width: 844, height: 390 };

function pickTarget(s) {
  const left = s.balls.filter((b) => !b.found);
  if (left.length) {
    let best = left[0];
    let bestD = Infinity;
    for (const b of left) {
      const d = Math.hypot(b.x - s.player.x, b.y - s.player.y);
      if (d < bestD) {
        best = b;
        bestD = d;
      }
    }
    return { x: best.x, y: best.y, needsAction: best.hide !== "open", dist: bestD };
  }
  return {
    x: s.nap.x,
    y: s.nap.y,
    needsAction: false,
    dist: Math.hypot(s.nap.x - s.player.x, s.nap.y - s.player.y),
  };
}

function blocked(x, y, s) {
  if (x < 42 || y < 42 || x > s.w - 42 || y > s.h - 42) return true;
  for (const o of s.solids) {
    if (o.kind === "circle") {
      if (Math.hypot(x - o.x, y - o.y) < o.r + s.player.r + 4) return true;
    } else {
      const cx = Math.max(o.x, Math.min(x, o.x + o.w));
      const cy = Math.max(o.y, Math.min(y, o.y + o.h));
      if (Math.hypot(x - cx, y - cy) < s.player.r + 4) return true;
    }
  }
  return false;
}

function steer(s, tx, ty) {
  let dx = tx - s.player.x;
  let dy = ty - s.player.y;
  const d = Math.hypot(dx, dy) || 1;
  let nx = dx / d;
  let ny = dy / d;
  const step = 26;
  if (!blocked(s.player.x + nx * step, s.player.y + ny * step, s)) return { x: nx, y: ny };
  const left = { x: -ny, y: nx };
  const right = { x: ny, y: -nx };
  const lpx = s.player.x + left.x * 36;
  const lpy = s.player.y + left.y * 36;
  const rpx = s.player.x + right.x * 36;
  const rpy = s.player.y + right.y * 36;
  const ld = blocked(lpx, lpy, s) ? Infinity : Math.hypot(lpx - tx, lpy - ty);
  const rd = blocked(rpx, rpy, s) ? Infinity : Math.hypot(rpx - tx, rpy - ty);
  if (ld === Infinity && rd === Infinity) return left;
  return ld <= rd ? left : right;
}

async function boot(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto("/?nosw=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__game && window.__game.ready);
  return errors;
}

async function shot(page, name) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: OUT + "/" + name + ".png" });
}

async function completeLevel(page) {
  const start = Date.now();
  let stuck = 0;
  let last = null;
  let flip = 1;
  while (Date.now() - start < 100000) {
    const s = await page.evaluate(() => window.__game.snapshot());
    if (s.mode === "complete") return s;
    if (!s.player) throw new Error("no player " + JSON.stringify(s));
    const target = pickTarget(s);
    let dir = steer(s, target.x, target.y);
    const moved = last ? Math.hypot(s.player.x - last.x, s.player.y - last.y) : 10;
    if (moved < 1.2) stuck += 1;
    else stuck = 0;
    last = { x: s.player.x, y: s.player.y };
    if (stuck > 5) {
      flip = -flip;
      dir = { x: -dir.y * flip, y: dir.x * flip };
      stuck = 0;
    }
    if (target.needsAction && target.dist < s.interactRange) {
      await page.evaluate(() => window.__game.setStick(0, 0));
      await page.evaluate(() => window.__game.tapAction());
      await page.waitForTimeout(520);
      continue;
    }
    let scale = 1;
    if (target.needsAction && target.dist < 100) scale = 0.4;
    if (!target.needsAction && target.dist < 48) scale = 0.45;
    await page.evaluate(({ x, y }) => window.__game.setStick(x, y), { x: dir.x * scale, y: dir.y * scale });
    await page.waitForTimeout(70);
  }
  const s = await page.evaluate(() => window.__game.snapshot());
  throw new Error("level timed out " + JSON.stringify(s));
}

test("title, select, play, and complete screenshots", async ({ page }) => {
  const errors = await boot(page);
  await page.setViewportSize(PORTRAIT);
  await page.waitForTimeout(150);
  await shot(page, "title-portrait");
  await page.setViewportSize(LANDSCAPE);
  await page.waitForTimeout(150);
  await shot(page, "title-landscape");

  await page.setViewportSize(PORTRAIT);
  await page.evaluate(() => window.__game.setCloseup(true));
  await page.waitForTimeout(250);
  await shot(page, "cooper-closeup-portrait");
  await page.setViewportSize(LANDSCAPE);
  await page.waitForTimeout(200);
  await shot(page, "cooper-closeup-landscape");
  await page.evaluate(() => window.__game.setCloseup(false));

  await page.setViewportSize(PORTRAIT);
  await page.click("#play");
  await expect(page.locator("#select")).toBeVisible();
  await page.waitForTimeout(100);
  await shot(page, "select-portrait");
  await page.setViewportSize(LANDSCAPE);
  await page.waitForTimeout(150);
  await shot(page, "select-landscape");

  await page.setViewportSize(PORTRAIT);
  await page.click('[data-level="1"]');
  await page.waitForFunction(() => window.__game.snapshot().mode === "play");
  await page.evaluate(() => window.__game.setStick(1, 0));
  await page.waitForTimeout(320);
  await shot(page, "play-portrait");
  const dig = await page.locator("#dig").boundingBox();
  const pause = await page.locator("#pause-btn").boundingBox();
  expect(dig.width).toBeGreaterThanOrEqual(44);
  expect(dig.height).toBeGreaterThanOrEqual(44);
  expect(pause.width).toBeGreaterThanOrEqual(44);
  expect(pause.height).toBeGreaterThanOrEqual(44);

  await page.setViewportSize(LANDSCAPE);
  await page.waitForTimeout(200);
  await shot(page, "play-landscape");
  const digL = await page.locator("#dig").boundingBox();
  expect(digL.width).toBeGreaterThanOrEqual(44);
  expect(digL.height).toBeGreaterThanOrEqual(44);

  await page.evaluate(() => window.__game.setStick(0, 0));
  await page.setViewportSize(PORTRAIT);
  const done = await completeLevel(page);
  expect(done.found).toBe(3);
  expect(done.mode).toBe("complete");
  await expect(page.locator("#complete")).toBeVisible();
  await page.waitForTimeout(200);
  await shot(page, "complete-portrait");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("cooper-bya-save-v1")));
  expect(saved.levels["1"].stars).toBeGreaterThanOrEqual(1);
  await page.setViewportSize(LANDSCAPE);
  await page.waitForTimeout(150);
  await shot(page, "complete-landscape");

  const text = await page.locator("body").innerText();
  expect(text.toLowerCase()).not.toContain("iphone");
  expect(text.toLowerCase()).not.toContain("tennis");
  expect(errors, errors.join("\n")).toEqual([]);
});

for (let level = 2; level <= 8; level++) {
  test("level " + level + " is completable", async ({ page }) => {
    const errors = await boot(page);
    await page.click("#play");
    await page.click('[data-level="' + level + '"]');
    await page.waitForFunction(() => window.__game.snapshot().mode === "play");
    const done = await completeLevel(page);
    expect(done.found).toBe(3);
    expect(done.mode).toBe("complete");
    await expect(page.locator("#complete")).toBeVisible();
    const saved = await page.evaluate((id) => {
      const data = JSON.parse(localStorage.getItem("cooper-bya-save-v1"));
      return data.levels[String(id)];
    }, level);
    expect(saved.stars).toBeGreaterThanOrEqual(1);
    expect(errors, errors.join("\n")).toEqual([]);
  });
}
