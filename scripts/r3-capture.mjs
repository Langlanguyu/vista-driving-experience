// Captures Chromium's actual compositor output. Run against the local Vite dev server.
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
const out = "docs/verification/round3",
  url = process.env.VISTA_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({ channel: "chrome" });
const sizes = { width: 1440, height: 900 };
const page = await browser.newPage({ viewport: sizes, deviceScaleFactor: 1 });
const btn = (n) => page.getByRole("button", { name: n, exact: true });
const load = async (p, q = "") => {
  await p.goto(url + "/" + q);
  await p.locator("[data-ready=true]").waitFor();
  await p.waitForTimeout(900);
};
const shot = (n) => page.screenshot({ path: path.join(out, n + ".png") });
try {
  await fs.mkdir(out, { recursive: true });
  for (const fov of [80, 88, 95]) {
    await load(page, "?fov=" + fov);
    await shot("fov-" + fov);
  }
  for (const tone of ["neutral", "aces"]) {
    await load(page, "?tone=" + tone);
    await shot("tone-" + tone);
  }
  await load(page);
  await page.waitForTimeout(2900);
  await btn("HUD ON").click();
  await page.waitForTimeout(250);
  await shot("01-hud-off");
  await btn("HUD OFF").click();
  await page.waitForTimeout(850);
  await shot("02-hud-on");
  await btn("查看感知原理").click();
  await page.waitForFunction(
    () => document.querySelector(".view").dataset.reveal === "1.000",
  );
  await page.waitForTimeout(3500);
  await shot("03-technical-reveal");
  await btn("退出揭示").click();
  await page.waitForFunction(
    () => document.querySelector(".view").dataset.reveal === "0.000",
  );
  await btn("展开控制台").click();
  await btn("低质量").click();
  await btn("收起控制台").click();
  await page.waitForTimeout(500);
  await shot("04-degraded");
  await btn("展开控制台").click();
  await btn("中质量").click();
  await btn("收起控制台").click();
  await page.waitForTimeout(500);
  await shot("04b-estimated");
  await btn("展开控制台").click();
  await btn("高质量").click();
  await page.getByRole("slider", { name: "场景时间" }).fill("5.1");
  await btn("收起控制台").click();
  await page.waitForTimeout(650);
  await shot("05-immersive");
  await load(page, "?omitTarget");
  await btn("HUD ON").click();
  await page.waitForTimeout(3400);
  await shot("depth-reference");
  await btn("查看感知原理").click();
  await page.waitForTimeout(3900);
  await shot("reveal-reference");
  const ctx = await browser.newContext({
    viewport: sizes,
    deviceScaleFactor: 1,
    recordVideo: { dir: out, size: sizes },
  });
  const movie = await ctx.newPage();
  await load(movie);
  const click = (n) =>
    movie.getByRole("button", { name: n, exact: true }).click();
  await click("HUD ON");
  await click("播放");
  await movie.waitForTimeout(1000);
  await click("HUD OFF");
  await movie.waitForTimeout(1150);
  await click("查看感知原理");
  await movie.waitForTimeout(2200);
  await click("退出揭示");
  await movie.waitForTimeout(2250);
  await click("暂停");
  const video = movie.video();
  await ctx.close();
  await video.saveAs(path.join(out, "interaction.webm"));
  await video.delete();
} finally {
  await browser.close();
}
