import { test, expect } from "@playwright/test";
const dir = "test-results/legacy-checks";
test("two camera poses, HUD-off occlusion and reproducible driving frames", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("requestfailed", (r) => failures.push(r.url()));
  page.on("pageerror", (e) => failures.push(e.message));
  await page.goto("/");
  const view = page.locator(".view"),
    hud = page.locator("[data-mode]");
  await expect(view).toHaveAttribute("data-ready", "true", { timeout: 45000 });
  await page.getByRole("button", { name: "展开控制台" }).click();
  const time = page.getByRole("slider", { name: "场景时间" }),
    anchor = await hud.getAttribute("data-anchor");
  await page.getByRole("button", { name: "HUD ON" }).click();
  await expect(hud).toHaveCount(0);
  await page.screenshot({ path: dir + "/driver-hud-off.png" });
  await page.getByRole("button", { name: "空间观察" }).click();
  await expect(view).toHaveAttribute("data-camera", "inspect");
  await page.screenshot({ path: dir + "/inspect.png" });
  await page.getByRole("button", { name: "返回驾驶" }).click();
  await page.getByRole("button", { name: "HUD OFF" }).click();
  await expect(time).toHaveValue("2.4");
  await expect(hud).toHaveAttribute("data-anchor", anchor!);
  for (const t of ["2.4", "6", "10"]) {
    await time.fill(t);
    await page.screenshot({ path: dir + "/frame-" + t + ".png" });
  }
  await time.fill("11.9");
  await page.getByRole("button", { name: "播放", exact: true }).click();
  await expect(time).toHaveValue("12");
  await page.getByRole("button", { name: "播放", exact: true }).click();
  await expect(time).not.toHaveValue("12");
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await time.fill("2.4");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.getByRole("button", { name: "全屏切换" }).click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await page.getByRole("button", { name: "收起控制台" }).click();
  await page.waitForFunction(
    () =>
      document.querySelector("canvas")!.height ===
      document.querySelector<HTMLElement>(".view")!.clientHeight,
  );
  await page.evaluate(
    () =>
      new Promise<void>((done) =>
        requestAnimationFrame(() => requestAnimationFrame(() => done())),
      ),
  );
  await page.screenshot({ path: dir + "/after-full.png" });
  expect(failures).toEqual([]);
});
