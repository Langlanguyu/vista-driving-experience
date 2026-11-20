import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const cfg = JSON.parse(
  readFileSync(new URL("../src/data/corridor.json", import.meta.url), "utf8"),
);

test("actual GLBs, instances and the occlusion proxy agree on physical dimensions", async ({
  page,
}) => {
  await page.goto("/?lab&auditVehicles");
  await expect(page.locator(".view")).toHaveAttribute("data-ready", "true");
  const v = JSON.parse(
    (await page.locator("canvas").getAttribute("data-vehicles"))!,
  );
  for (const car of [v.target, v.ego, ...v.parked, v.xray]) {
    car.forEach((dim: number, i: number) =>
      expect(dim).toBeCloseTo(cfg.targetSize[i], 3),
    );
  }
  v.truck.forEach((dim: number, i: number) =>
    expect(dim).toBeCloseTo(cfg.truckSize[i], 3),
  );
  expect(v.chassis[0] / v.chassis[2]).toBeCloseTo(12.12258 / 36.3996, 4);
});

test("isolated cockpit pixels match in normal, left and right projection", async ({
  page,
}) => {
  await page.goto("/?lab&isolateCockpit");
  await expect(page.locator(".view")).toHaveAttribute("data-ready", "true");
  await page.getByLabel("驾驶场景").selectOption("cross");
  await page.getByRole("button", { name: "展开控制台" }).click();
  const select = page.getByLabel("研究投影", { exact: true });
  const style =
    ".mast,.controls,.hudLayer,.drivingReadout,.modeTitle,.sceneDissolve,.compareLabels{visibility:hidden!important}";
  const shot = () => page.screenshot({ style, animations: "disabled" });
  const normal = await shot(),
    eye = await page.locator(".view").getAttribute("data-eye");
  for (const [mode, power] of [
    ["left", "-1.0000"],
    ["right", "1.0000"],
  ]) {
    await select.selectOption(mode);
    await expect(page.locator(".view")).toHaveAttribute("data-strength", power);
    await expect(page.locator(".view")).toHaveAttribute("data-eye", eye!);
    expect((await shot()).equals(normal)).toBeTruthy();
  }
});

test("manual fog and transport survive a story detour; switching out of Inspect restores forward driver pose", async ({
  page,
}) => {
  await page.goto("/?lab&verifyCamera");
  const v = page.locator(".view"),
    btn = (name: string) => page.getByRole("button", { name, exact: true });
  await expect(v).toHaveAttribute("data-ready", "true");
  await page.getByLabel("驾驶场景").selectOption("degraded");
  await btn("展开控制台").click();
  await page.getByRole("slider", { name: "场景时间" }).fill("5");
  await btn("高质量").click();
  await btn("参数设置").click();
  await page.getByLabel("雾浓度", { exact: true }).fill("1");
  await page.getByLabel("注入 V2X 拥塞与丢包").uncheck();
  await btn("关闭").click();
  const policy = page.locator(".evidenceBar");
  await expect(policy).toHaveAttribute("data-policy", "CONFIRMED_TARGET");
  await btn("低质量").click();
  await expect(policy).toHaveAttribute("data-policy", "DIRECTION_ONLY");
  await btn("STORY EXPERIENCE").click();
  await btn("LIVE LAB ↗").click();
  await expect(v).toHaveAttribute("data-time", "5.000");
  await expect(policy).toHaveAttribute("data-policy", "DIRECTION_ONLY");
  await expect(btn("低质量")).toHaveAttribute("aria-pressed", "true");
  await btn("参数设置").click();
  await page.getByRole("slider", { name: "基础传输延迟" }).fill("1800");
  await btn("关闭").click();
  await expect(policy).toHaveAttribute("data-policy", "PERCEPTION_LIMITED");
  await expect(page.locator(".spatial")).toHaveCount(0);
  await page.getByLabel("驾驶场景").selectOption("truck");
  await page.getByRole("button", { name: "空间观察", exact: true }).click();
  await expect(v).toHaveAttribute("data-owner", "inspect");
  await expect(page.locator("canvas")).not.toHaveAttribute(
    "data-heading",
    "0.000000",
  );
  for (const id of ["cross", "truck", "degraded"]) {
    await page.getByLabel("驾驶场景").selectOption(id);
    await expect(v).toHaveAttribute("data-owner", "driver");
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-heading",
      "0.000000",
    );
  }
});
