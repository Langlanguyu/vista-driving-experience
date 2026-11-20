import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const url = process.env.VISTA_URL ?? "http://127.0.0.1:5186/";
const out = "docs/verification/r6";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
  args: ["--autoplay-policy=document-user-activation-required"],
});
try {
  const film = process.argv.includes("--film"),
    w = Number(process.env.WIDTH) || 1440,
    h = w === 1920 ? 1080 : 900;
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    ...(film
      ? { recordVideo: { dir: out, size: { width: w, height: h } } }
      : {}),
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(url);
  await page.waitForSelector(".view[data-ready=true]");
  const secs = () =>
    page.locator(".film").getAttribute("data-seconds").then(Number);
  if (film) {
    // Replay after asset warmup. Head/tail slate durations are measured in page time.
    await page.getByLabel("探索时间轴").click();
    await page.getByLabel("影片时间").fill("180");
    await page.getByText("ENABLE SOUND", { exact: true }).click();
    await page.getByText("SOUND ON", { exact: true }).waitFor();
    await page.getByLabel("探索时间轴").click();
    await page.getByRole("button", { name: "REPLAY STORY" }).click();
    await page.evaluate(() => {
      window.cutFrames = [];
      let previous = -1;
      const sample = () => {
        const sec = Number(document.querySelector(".film")?.dataset.seconds);
        if (sec !== previous) {
          window.cutFrames.push(sec);
          previous = sec;
        }
        if (sec < 180) requestAnimationFrame(sample);
      };
      sample();
    });
    const start = await page.evaluate(
      () =>
        performance.now() / 1000 -
        Number(document.querySelector(".film").dataset.seconds),
    );
    await page.waitForFunction(
      () => Number(document.querySelector(".film")?.dataset.seconds) >= 180,
      null,
      { timeout: 205000 },
    );
    await page.waitForTimeout(500);
    const metrics = await page.evaluate(() => ({
      samples: window.cutFrames.length,
      seconds: window.cutFrames.at(-1) - window.cutFrames[0],
      chrome: navigator.userAgent,
    }));
    const video = page.video();
    await ctx.close();
    await video.saveAs(out + "/capture.webm");
    await writeFile(
      out + "/capture.json",
      JSON.stringify({ start, errors, w, h, metrics }),
    );
  } else {
    await page.getByLabel("探索时间轴").click();
    for (const sec of [
      1.8, 5.8, 8.2, 12.2, 27, 60, 97, 117, 121, 128, 142, 146.5, 156, 180,
    ]) {
      await page.getByLabel("影片时间").fill(String(sec));
      await page.getByLabel("探索时间轴").click();
      await page.waitForTimeout(170);
      await page.screenshot({
        path: out + "/shot-" + sec + ".jpg",
        quality: 90,
      });
      await page.getByLabel("探索时间轴").click();
    }
    await ctx.close();
  }
  console.log({ errors });
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
