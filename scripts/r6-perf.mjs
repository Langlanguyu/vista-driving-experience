import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
const refinement = process.argv.includes("--r61");
const url = process.env.VISTA_URL ?? "http://127.0.0.1:4186/";
const browser = await chromium.launch({ channel: "chrome" });
try {
  const result = [];
  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(url);
    await page.waitForSelector(".view[data-ready=true]");
    for (const title of [
      "Prologue",
      "Beyond the frame",
      "How light reaches you",
    ]) {
      await page.getByRole("button", { name: title, exact: true }).click();
      if (refinement) {
        if (title === "Prologue") {
          await page.mouse.move(600, 330);
          await page.mouse.wheel(0, 450);
        } else {
          await page.getByLabel("探索时间轴").click();
          await page
            .getByLabel("影片时间")
            .fill(title === "Beyond the frame" ? "54" : "116");
          await page.getByLabel("探索时间轴").click();
          await page.getByLabel("自动播放").click();
        }
      }
      const data = await page.evaluate(async () => {
        const el = document.querySelector(".film"),
          gl = document.querySelector("canvas").getContext("webgl2");
        const renderer = gl.getParameter(
          gl.getExtension("WEBGL_debug_renderer_info").UNMASKED_RENDERER_WEBGL,
        );
        const times = [];
        let last = -1;
        await new Promise((resolve) => {
          const start = performance.now();
          function tick(now) {
            const t = +el.dataset.seconds;
            if (t !== last) {
              last = t;
              times.push(now);
            }
            if (now - start < 6500) requestAnimationFrame(tick);
            else resolve();
          }
          requestAnimationFrame(tick);
        });
        const delta = times
          .slice(1)
          .map((x, i) => x - times[i])
          .sort((a, b) => a - b);
        return {
          renderer,
          frameCount: times.length,
          fps: (1000 * (times.length - 1)) / (times.at(-1) - times[0]),
          p95FrameMs: delta[Math.floor(0.95 * delta.length)],
        };
      });
      result.push({ width, height, title, ...data });
    }
    await page.close();
  }
  console.log(result);
  await writeFile(
    refinement
      ? "docs/verification/r61/perf.json"
      : "docs/verification/r6/perf.json",
    JSON.stringify({ url, browser: browser.version(), result }, null, 2),
  );
} finally {
  await browser.close();
}
