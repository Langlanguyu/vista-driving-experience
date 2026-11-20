import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const baseline = process.argv.includes("--before"),
  label = baseline ? "before" : "after",
  path = "docs/verification/r61/" + label;
await mkdir(path, { recursive: true });
const b = await chromium.launch({ channel: "chrome" });
try {
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on("pageerror", (e) => {
    console.error(e);
    process.exitCode = 1;
  });
  await p.goto(process.env.VISTA_URL ?? "http://127.0.0.1:5187/");
  await p.waitForSelector("[data-ready=true]");
  for (const t of baseline
    ? [27, 60, 117, 180]
    : [0, 4.9, 7.5, 12, 27, 60, 110, 114, 117, 122, 128, 180]) {
    await p.getByLabel("探索时间轴").click();
    await p.getByLabel("影片时间").fill(String(t));
    await p.getByLabel("探索时间轴").click();
    await p.waitForTimeout(200);
    await p.screenshot({ path: path + "/" + t + ".jpg", quality: 92 });
    const pose = await p
      .locator(".view")
      .evaluate((el) => ({
        eye: el.dataset.eye,
        time: el.dataset.time,
        scene: el.dataset.scene,
        strength: el.dataset.strength,
      }));
    await writeFile(path + "/" + t + ".json", JSON.stringify(pose));
  }
} finally {
  await b.close();
}
