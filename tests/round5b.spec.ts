import { test, expect } from "@playwright/test";
test("optical lab refocuses, loses rays outside the eye box, recovers and restores the story optical boundary", async ({
  page,
}) => {
  await page.goto("/?lab");
  const view = page.locator(".view");
  await expect(view).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: "OPTICAL LAB", exact: true }).click();
  await expect(view).toHaveAttribute("data-rays", "9");
  await page.getByText("光路与设计参数", { exact: true }).click();
  await page.getByRole("slider", { name: "等效设计距离" }).fill("6.5");
  await expect(view).toHaveAttribute("data-image-distance", "6.50000");
  await page.getByRole("slider", { name: "眼点横移" }).fill("84");
  await expect(view).toHaveAttribute("data-rays", "0");
  await page.getByRole("slider", { name: "眼点横移" }).fill("0");
  await expect(view).toHaveAttribute("data-rays", "9");
  await page.getByRole("button", { name: "平面主镜" }).click();
  await expect(view).not.toHaveAttribute("data-image-distance", "6.50000");
  for (const control of [
    "传播光线",
    "虚像延长线",
    "光学组件",
    "技术剖面",
    "全光路远景",
  ]) {
    const b = page.getByRole("button", { name: control, exact: true }),
      old = await b.getAttribute("aria-pressed");
    await b.click();
    await expect(b).not.toHaveAttribute("aria-pressed", old);
  }
  await page.getByLabel("退出光学实验").click();
  await page.getByRole("button", { name: "STORY EXPERIENCE" }).click();
  await page.getByLabel("探索时间轴").click();
  const time = page.getByLabel("影片时间");
  for (const [t, admission] of [
    [141, "field"],
    [146.5, "eye"],
    [150, "field"],
  ] as const) {
    await time.fill(String(t));
    await expect(view).toHaveAttribute("data-admission", admission);
  }
  await time.fill("156");
  await expect(view).toHaveAttribute("data-console", "1.000");
  await expect(page.locator(".futureDirection")).toBeVisible();
  await time.fill("180");
  await expect(view).toHaveAttribute("data-console", "0.000");
  await expect(
    page.getByRole("button", { name: "REPLAY STORY" }),
  ).toBeVisible();
});
