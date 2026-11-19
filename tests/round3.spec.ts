import { test, expect } from "@playwright/test";
test("teaching reveal freezes the same geometry, restores projection and resumes only prior motion", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const view = page.locator(".view"),
    hud = page.locator("[data-mode]");
  await expect(view).toHaveAttribute("data-ready", "true", { timeout: 45000 });
  await expect(hud).toHaveAttribute("data-coverage", "1.000");
  const anchor = await hud.getAttribute("data-anchor");
  await page.getByRole("button", { name: "查看感知原理" }).click();
  await expect(view).toHaveAttribute("data-reveal", "1.000");
  await expect(view).toHaveAttribute("data-time", "2.400");
  await expect(hud).toHaveAttribute("data-mode", "reveal");
  await page.getByRole("button", { name: "退出揭示" }).click();
  await expect(view).toHaveAttribute("data-reveal", "0.000");
  await expect(hud).toHaveAttribute("data-anchor", anchor!);
  await page.getByRole("button", { name: "播放", exact: true }).click();
  await expect(view).not.toHaveAttribute("data-time", "2.400");
  await page.getByRole("button", { name: "查看感知原理" }).click();
  await expect(view).toHaveAttribute("data-reveal", "1.000");
  const frozen = await view.getAttribute("data-time");
  await page.getByRole("button", { name: "退出揭示" }).click();
  await expect(view).toHaveAttribute("data-reveal", "0.000");
  await expect(view).not.toHaveAttribute("data-time", frozen!);
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await page.getByRole("button", { name: "展开控制台" }).click();
  await page.getByRole("button", { name: "隐藏座舱" }).click();
  await expect(page.getByRole("button", { name: "显示座舱" })).toBeVisible();
  expect(errors).toEqual([]);
});
