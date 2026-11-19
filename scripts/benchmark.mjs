// Run with a local production preview already listening at VISTA_URL.
import { chromium } from "playwright";
import { existsSync, writeFileSync } from "node:fs";
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || (existsSync(chrome) ? chrome : undefined),
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  await page.goto(
    (process.env.VISTA_URL ?? "http://127.0.0.1:4173") + "/?benchmark",
  );
  await page.locator("[data-ready=true]").waitFor({ timeout: 45000 });
  await page.getByRole("button", { name: "展开控制台" }).click();
  const run = async (scene, projection) => {
    await page.getByLabel("驾驶场景").selectOption(scene);
    await page.getByRole("button", { name: "重置", exact: true }).click();
    if (scene === "cross")
      await page
        .getByLabel("研究投影", { exact: true })
        .selectOption(projection);
    await page.getByRole("button", { name: "播放", exact: true }).click();
    await page.waitForFunction(
      () =>
        Number(document.querySelector('input[aria-label="场景时间"]').value) >
        1,
    );
    await page.evaluate(() => {
      window.vistaFrames = [];
    });
    await page.waitForFunction(
      () =>
        Number(document.querySelector('input[aria-label="场景时间"]').value) >=
        11,
    );
    const sample = await page.evaluate(() => {
      const times = window.vistaFrames,
        delta = times
          .slice(1)
          .map((t, i) => t - times[i])
          .sort((a, b) => a - b);
      const elapsed = times.at(-1) - times[0],
        canvas = document.querySelector("canvas"),
        gl = canvas.getContext("webgl2"),
        ext = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        frames: times.length,
        durationMs: Math.round(elapsed),
        fps: +((1000 * (times.length - 1)) / elapsed).toFixed(1),
        p95Ms: +delta[Math.floor(delta.length * 0.95)].toFixed(1),
        p99Ms: +delta[Math.floor(delta.length * 0.99)].toFixed(1),
        canvas: [canvas.width, canvas.height],
        gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown",
      };
    });
    return { ...sample, scene, projection };
  };
  const runs = [];
  for (const [scene, mode] of [
    ["truck", "normal"],
    ["cross", "normal"],
    ["cross", "left"],
    ["cross", "right"],
    ["cross", "compare"],
    ["degraded", "normal"],
  ])
    runs.push(await run(scene, mode));
  const result = {
    date: new Date().toISOString(),
    browser: browser.version(),
    viewport: [1440, 900],
    DPR: 1,
    build: "Vite production preview",
    method:
      "R3F useFrame timestamps during t=1..11 s playback for each condition, excluding asset loading",
    runs,
  };
  writeFileSync(
    "docs/verification/round45/performance.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(result);
} finally {
  await browser.close();
}
