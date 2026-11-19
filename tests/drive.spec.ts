import { test, expect } from "@playwright/test";
test("quality, clock, link failure, recovery and display share one scenario", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".view")).toHaveAttribute("data-ready", "true", {
    timeout: 45000,
  });
  const hud = page.locator("[data-mode]");
  await expect(hud).toHaveAttribute("data-mode", "world");
  await expect(
    page.getByText("WebGL 初始化失败", { exact: false }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "展开控制台" }).click();
  const anchor = await hud.getAttribute("data-anchor");
  await page.screenshot({
    path: "test-results/legacy-checks/after-desktop.png",
  });
  for (const [label, mode] of [
    ["中质量", "region"],
    ["低质量", "direction"],
    ["高质量", "world"],
  ]) {
    await page.getByRole("button", { name: label }).click();
    await expect(hud).toHaveAttribute("data-mode", mode);
  }
  await expect(hud).toHaveAttribute("data-anchor", anchor!);
  await page.getByRole("button", { name: "参数设置" }).click();
  await page.getByRole("button", { name: "传统预警" }).click();
  await expect(hud).toHaveAttribute("data-mode", "direction");
  await page.getByRole("button", { name: "VISTA 增强" }).click();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("button", { name: "播放", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "暂停", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  const timeline = page.getByRole("slider", { name: "场景时间" });
  await timeline.fill("8.8");
  await expect(hud).not.toHaveAttribute("data-anchor", anchor!);
  await timeline.fill("2.4");
  await expect(hud).toHaveAttribute("data-anchor", anchor!);
  await page.getByRole("button", { name: "参数设置" }).click();
  await page.getByRole("button", { name: "中断消息" }).click();
  await expect(hud).toHaveAttribute("data-mode", "unavailable", {
    timeout: 10000,
  });
  await page.getByRole("button", { name: "恢复消息" }).click();
  await expect(hud).toHaveAttribute("data-mode", "world", { timeout: 5000 });
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("button", { name: "重置" }).click();
  await expect(timeline).toHaveValue("0");
  await page.getByRole("button", { name: "收起控制台" }).click();
  await expect(timeline).toBeHidden();
  await page.getByRole("button", { name: "展开控制台" }).click();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.getByRole("button", { name: "空间观察" })).toBeInViewport({
    ratio: 1,
  });
  await page.screenshot({
    path: "test-results/legacy-checks/after-laptop.png",
  });
  expect(errors).toEqual([]);
});
