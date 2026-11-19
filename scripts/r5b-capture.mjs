import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const dir = "docs/verification/round5b",
  url = process.env.VISTA_URL ?? "http://127.0.0.1:5173";
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" }),
  fullFilm = process.argv.includes("--film"),
  video = fullFilm || process.argv.includes("--video"),
  bench = process.argv.includes("--performance");
const registration = process.argv.includes("--registration");
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  ...(video
    ? { recordVideo: { dir, size: { width: 1440, height: 900 } } }
    : {}),
});
const p = await ctx.newPage(),
  errors = [];
p.on("pageerror", (e) => errors.push(String(e)));
p.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const capture = async (name) => {
  await p.waitForTimeout(230);
  await p.screenshot({ path: dir + "/" + name + ".png" });
};
try {
  await p.goto(
    url +
      "/?" +
      (video
        ? "story&benchmark"
        : bench
          ? "benchmark"
          : registration
            ? "verifyProjection"
            : ""),
  );
  await p.locator("[data-ready=true]").waitFor({ timeout: 45000 });
  if (video) {
    await p.getByLabel("影片时间").fill(fullFilm ? "0" : "105");
    const start = Date.now();
    await p.evaluate(() => {
      window.vistaFrames = [];
      window.lostContexts = 0;
      document
        .querySelector("canvas")
        .addEventListener("webglcontextlost", () => window.lostContexts++);
    });
    await p.getByLabel("自动播放", { exact: true }).click();
    await p.waitForFunction(
      (t) => +document.querySelector(".film").dataset.seconds >= t,
      fullFilm ? 180 : 135.05,
      { timeout: fullFilm ? 210000 : 50000 },
    );
    if (!fullFilm) await p.getByLabel("暂停叙事").click();
    if (fullFilm) {
      await p.getByRole("button", { name: "REPLAY STORY" }).waitFor();
      const stats = await p.evaluate(() => {
        const t = window.vistaFrames,
          intervals = t
            .slice(1)
            .map((v, i) => v - t[i])
            .sort((a, b) => a - b);
        return {
          frames: t.length,
          meanFps: (1000 * (t.length - 1)) / (t.at(-1) - t[0]),
          p95Ms: intervals[Math.floor(0.95 * intervals.length)],
          contextLoss: window.lostContexts,
          finalSeconds: document.querySelector(".film").dataset.seconds,
        };
      });
      await writeFile(
        dir + "/film-run.json",
        JSON.stringify(
          {
            browser: browser.version(),
            elapsed: (Date.now() - start) / 1000,
            viewport: [1440, 900],
            ...stats,
            errors,
          },
          null,
          2,
        ),
      );
      if (stats.contextLoss) throw Error("WebGL context lost");
    }
    const clip = p.video();
    await ctx.close();
    await clip.saveAs(
      dir + (fullFilm ? "/VISTA-R5B-180s.webm" : "/optical-sequence.webm"),
    );
    await clip.delete();
  } else {
    await p.getByLabel("驾驶场景").selectOption("cross");
    await p.getByLabel("展开控制台").click();
    await p.locator(".projectionResearch summary").click();
    const results = [];
    if (registration) await p.getByRole("button", { name: "隐藏座舱" }).click();
    for (const algo of ["normal", "current", "pannini", "structure"]) {
      await p
        .getByLabel("映射算法")
        .selectOption(registration && algo === "normal" ? "current" : algo);
      // The RSU target is outside the driving-HUD limit in this preset. Zero wing power
      // keeps standard rays while the research policy exposes its in-frame test anchor.
      if (registration)
        await p
          .getByRole("slider", { name: "扩展强度" })
          .fill(algo === "normal" ? "0" : "1");
      await p
        .getByRole("slider", { name: "场景时间" })
        .fill(registration && algo === "normal" ? "7.2" : "2.4");
      await p.waitForTimeout(1250);
      const metrics = await p.locator("#projection-result").innerText();
      await p.getByLabel("收起控制台", { exact: true }).click();
      if (registration) {
        await p.waitForTimeout(650);
        const anchor = p.locator(".spatial"),
          x = Number(await anchor.getAttribute("data-anchor")),
          y = Number(await anchor.getAttribute("data-anchor-y"));
        const png = (
          await p.screenshot({ path: dir + "/fixture-" + algo + ".png" })
        ).toString("base64");
        const sample = await p.evaluate(
          async ({ png, x, y }) => {
            const img = new Image();
            img.src = "data:image/png;base64," + png;
            await img.decode();
            const c = document.createElement("canvas");
            c.width = img.width;
            c.height = img.height;
            const ctx = c.getContext("2d");
            ctx.drawImage(img, 0, 0);
            const { data } = ctx.getImageData(0, 0, c.width, c.height);
            let sx = 0,
              sy = 0,
              n = 0;
            for (let j = 0; j < c.height; j++)
              for (let i = 0; i < c.width; i++) {
                const k = 4 * (j * c.width + i);
                if (data[k] > 165 && data[k + 1] < 110 && data[k + 2] > 160) {
                  sx += i + 0.5;
                  sy += j + 0.5;
                  n++;
                }
              }
            return {
              count: n,
              pixelX: sx / n,
              pixelY: sy / n,
              error: Math.hypot(sx / n - x, sy / n - y),
            };
          },
          { png, x, y },
        );
        if (!sample.count || sample.error > 2.0)
          throw Error(algo + " " + JSON.stringify(sample));
        results.push({ algo, x, y, ...sample });
      } else if (bench) {
        await p.getByLabel("播放", { exact: true }).click();
        await p.waitForTimeout(360);
        await p.evaluate(() => (window.vistaFrames = []));
        await p.waitForTimeout(3600);
        const stats = await p.evaluate(() => {
          const t = window.vistaFrames,
            ms = t
              .slice(1)
              .map((v, i) => v - t[i])
              .sort((a, b) => a - b);
          const gl = document.querySelector("canvas").getContext("webgl2"),
            e = gl.getExtension("WEBGL_debug_renderer_info");
          return {
            frames: t.length,
            fps: (1000 * (t.length - 1)) / (t.at(-1) - t[0]),
            p95ms: ms[Math.floor(0.95 * ms.length)],
            gpu: e && gl.getParameter(e.UNMASKED_RENDERER_WEBGL),
          };
        });
        results.push({ algo, ...stats });
        await p.getByLabel("暂停", { exact: true }).click();
      } else {
        await capture("projection-" + algo);
        results.push({
          algo,
          metrics,
          anchor: await p
            .locator(".spatial")
            .evaluateAll((nodes) =>
              nodes.map((el) => [el.dataset.anchor, el.dataset.anchorY]),
            ),
        });
      }
      await p.getByLabel("展开控制台").click();
    }
    await writeFile(
      dir +
        "/" +
        (bench
          ? "performance"
          : registration
            ? "registration"
            : "projection-browser") +
        ".json",
      JSON.stringify({ browser: browser.version(), results }, null, 2),
    );
    if (!bench && !registration) {
      await p.getByRole("button", { name: "OPTICAL LAB", exact: true }).click();
      await capture("optical-lab");
      await p.getByRole("slider", { name: "眼点横移" }).fill("84");
      await capture("optical-lost");
      await p.getByLabel("退出光学实验").click();
      await p.getByRole("button", { name: "STORY EXPERIENCE" }).click();
      for (const [t, name] of [
        [107, "image"],
        [115, "cutaway"],
        [121.8, "mirrors"],
        [128, "virtual"],
        [134.9, "return"],
        [138, "digital"],
        [149, "fov"],
        [155, "eyebox"],
        [167, "warning"],
        [171, "console"],
        [179, "finale"],
      ]) {
        await p.getByLabel("影片时间").fill(String(t));
        await capture("story-" + name);
      }
    }
  }
  if (errors.length) throw Error(errors.join("\n"));
} finally {
  await browser.close();
}
