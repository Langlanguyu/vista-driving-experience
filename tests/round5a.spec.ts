import { test, expect } from "@playwright/test";
test("five real HUD representations, chapter seeks, restart and reversible Lab detours", async ({
  page,
}) => {
  await page.goto("/?story&verifyProjection");
  const view = page.locator(".view"),
    film = page.locator(".film"),
    range = page.getByLabel("影片时间");
  await expect(view).toHaveAttribute("data-ready", "true");
  await page.getByLabel("探索时间轴").click();
  const canvas = await page.locator("canvas").elementHandle();
  for (const [sec, level, mode] of [
    [77, "precise", "world"],
    [82, "estimated", "region"],
    [87, "directional", "direction"],
    [92, "limited", "unavailable"],
    [97, "stale", "unavailable"],
    [102.8, "estimated", "region"],
    [104.8, "precise", "world"],
  ] as const) {
    await range.fill(String(sec));
    await expect(page.locator(".filmEvidence")).toHaveAttribute(
      "data-level",
      level,
    );
    await expect(page.locator(".spatial,.direction")).toHaveAttribute(
      "data-mode",
      mode,
    );
    if (mode === "unavailable")
      await expect(page.locator(".direction")).toHaveAttribute(
        "data-signal",
        level,
      );
    await expect(view).toHaveAttribute(
      "data-xray",
      String(level === "precise"),
    );
  }
  await range.fill("60");
  await expect(view).toHaveAttribute("data-strength", "-1.0000");
  const eye = await view.getAttribute("data-eye");
  await page.getByRole("button", { name: "LIVE LAB ↗", exact: true }).click();
  await expect(view).toHaveAttribute("data-owner", "driver");
  await page.getByRole("button", { name: "STORY EXPERIENCE" }).click();
  await expect(view).toHaveAttribute("data-strength", "-1.0000");
  await expect(view).toHaveAttribute("data-eye", eye!);
  await page.getByLabel("探索时间轴").click();
  await page.getByRole("button", { name: "How light reaches you", exact: true }).click();
  await expect(film).toHaveAttribute("data-chapter", "4");
  await range.fill("126");
  await page.getByRole("button", { name: "重看本章" }).click();
  await expect
    .poll(async () =>
      Math.abs(Number(await film.getAttribute("data-seconds")) - 105),
    )
    .toBeLessThan(0.03);
  await page.getByRole("button", { name: "自动播放" }).click();
  await expect
    .poll(async () => Number(await film.getAttribute("data-seconds")))
    .toBeGreaterThan(105.2);
  await page.getByRole("button", { name: "暂停叙事" }).click();
  const paused = Number(await film.getAttribute("data-seconds"));
  await page.waitForTimeout(250);
  expect(
    Math.abs(Number(await film.getAttribute("data-seconds")) - paused),
  ).toBeLessThan(0.03);
  await range.fill("180");
  await page.getByRole("button", { name: "REPLAY STORY" }).click();
  await expect(film).toHaveAttribute("data-chapter", "0");
  await expect(film).toHaveAttribute("data-phase", "INTRO_IDLE");
  await expect(film).toHaveAttribute("data-playing", "false");
  expect(
    await canvas!.evaluate((el) => el === document.querySelector("canvas")),
  ).toBeTruthy();
});
