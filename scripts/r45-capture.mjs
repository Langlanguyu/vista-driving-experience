import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const out = "docs/verification/round45";
await mkdir(out, { recursive: true });
const url = process.env.VISTA_URL || "http://127.0.0.1:5173",
  browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (err) => errors.push(err.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const btn = (n) => page.getByRole("button", { name: n, exact: true });
const shot = async (n) => {
  await page.waitForTimeout(500);
  await page.screenshot({ path: out + "/" + n + ".png" });
};
const open = async (q) => {
  await page.goto(url + "/" + q);
  await page.locator("[data-ready=true]").waitFor();
};
const drawer = async (fn) => {
  await btn("展开控制台").click();
  await fn();
  await btn("收起控制台").click();
  await page.waitForTimeout(700);
};
const scene = (id) => page.getByLabel("驾驶场景").selectOption(id);
const seek = (t) =>
  page.getByRole("slider", { name: "场景时间" }).fill(String(t));
try {
  const audits = [];
  await page.route("**/__vehicle-study*", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: '<style>body{margin:0}</style><script type="module" src="/scripts/model-study.ts"></script>',
    }),
  );
  for (const [asset, mode] of [
    ["coupe", "raw"],
    ["coupe", "legacy"],
    ["coupe", "uniform"],
    ["cargo", "raw"],
  ]) {
    await page.goto(url + "/__vehicle-study?asset=" + asset + "&mode=" + mode);
    await page.locator("body[data-ready=true]").waitFor();
    await shot("model-" + asset + "-" + mode);
    audits.push(
      JSON.parse(await page.locator("body").getAttribute("data-audit")),
    );
  }
  await writeFile(out + "/models.json", JSON.stringify(audits, null, 2) + "\n");
  const poses = [];
  for (const q of ["?auditVehicles", "?isolateCockpit"]) {
    const isolated = q.includes("isolate");
    await open(q);
    if (!isolated) {
      await shot("01-truck");
      await writeFile(
        out + "/instances.json",
        await page.locator("canvas").getAttribute("data-vehicles"),
      );
    }
    await scene("cross");
    await btn("HUD ON").click();
    await page.waitForTimeout(3700);
    for (const mode of ["normal", "left", "right", "compare"]) {
      if (mode !== "normal")
        await drawer(async () =>
          page.getByLabel("研究投影", { exact: true }).selectOption(mode),
        );
      await shot((isolated ? "cabin" : "street") + "-" + mode);
      poses.push([
        isolated,
        mode,
        await page.locator(".view").getAttribute("data-eye"),
      ]);
    }
  }
  await writeFile(out + "/poses.json", JSON.stringify(poses, null, 2) + "\n");
  await open("");
  await scene("cross");
  await btn("HUD ON").click();
  await drawer(async()=>seek(6.8));
  await shot("vehicle-cross-normal");
  await drawer(async()=>page.getByLabel("研究投影",{exact:true}).selectOption("left"));
  await shot("vehicle-cross-left");
  await scene("degraded");
  for (const [name, t] of [
    ["clear", 0],
    ["estimate", 3.2],
    ["direction", 5],
    ["expired", 7.2],
    ["reacquire", 8.45],
    ["retrack",8.9],
    ["recovered", 11.8],
  ]) {
    await drawer(async () => seek(t));
    await shot("fog-" + name);
  }
  // Independent manual reproduction, including reliable RSU geometry in dense fog.
  await drawer(async () => {
    await seek(5);
    await btn("高质量").click();
    await btn("参数设置").click();
    await page.getByLabel("注入 V2X 拥塞与丢包").uncheck();
    await page.getByRole("slider", { name: "雾浓度" }).fill("1");
    await btn("关闭").click();
  });
  await shot("fog-dense-confirmed");
  for (const [button, file] of [
    ["中质量", "estimated"],
    ["低质量", "direction"],
  ]) {
    await drawer(async () => btn(button).click());
    await shot("fog-dense-" + file);
  }
  await scene("truck");
  await drawer(async () => seek(10));
  await shot("truck-emergence");
  await scene("truck");
  await btn("STORY EXPERIENCE").click();
  await shot("story-exterior");
  if (errors.length) throw Error([...new Set(errors)].join("\n"));
} finally {
  await browser.close();
}
