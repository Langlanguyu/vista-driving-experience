import { test, expect } from "@playwright/test";

test("mirror expansion keeps the eye fixed and registers the estimated point with a real WebGL mesh", async ({
  page,
}) => {
  await page.goto("/?lab&verifyProjection");
  const view = page.locator(".view");
  await expect(view).toHaveAttribute("data-ready", "true");
  await page.getByLabel("驾驶场景").selectOption("cross");
  const eye = await view.getAttribute("data-eye");
  await expect(page.locator(".edgeLeft")).toHaveAttribute(
    "data-policy",
    "DIRECTION_ONLY",
  );
  await page.getByRole("button", { name: "研究投影", exact: true }).click();
  for (const side of ["left", "right"]) {
    if (side === "right") {
      await page.getByRole("button", { name: "展开控制台" }).click();
      await page.getByLabel("横向来车", { exact: true }).selectOption("right");
      await page.getByLabel("研究投影", { exact: true }).selectOption("right");
      await page.getByRole("button", { name: "收起控制台" }).click();
    }
    await expect(view).toHaveAttribute(
      "data-strength",
      side === "left" ? "-1.0000" : "1.0000",
    );
    await expect(view).toHaveAttribute("data-eye", eye!);
    const anchor = page.locator(".spatial");
    const x = Number(await anchor.getAttribute("data-anchor")),
      y = Number(await anchor.getAttribute("data-anchor-y"));
    // Decode Chromium's actual compositor image and locate the magenta fixture
    // rendered by a metric sphere at the world estimate, independently of the SVG.
    const png = (await page.screenshot()).toString("base64");
    const offset = await page.evaluate(
      async ({ png, x, y }) => {
        const img = new Image();
        img.src = "data:image/png;base64," + png;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, c.width, c.height);
        let sx = 0,
          sy = 0,
          count = 0;
        for (let j = 0; j < c.height; j++)
          for (let i = 0; i < c.width; i++) {
            const k = (j * c.width + i) * 4;
            if (data[k] > 165 && data[k + 1] < 110 && data[k + 2] > 160) {
              sx += i + 0.5;
              sy += j + 0.5;
              count++;
            }
          }
        return count ? Math.hypot(sx / count - x, sy / count - y) : Infinity;
      },
      { png, x, y },
    );
    console.log(side, "GPU marker vs HUD (CSS px)", offset);
    expect(offset).toBeLessThan(2);
  }
});
test("three live presets reset the clock; the first wheel starts the story and explicit exploration reverses the camera; the ending hands control to lab on request", async ({
  page,
}) => {
  await page.goto("/?lab");
  const view = page.locator(".view");
  await expect(view).toHaveAttribute("data-ready", "true");
  await page.getByLabel("驾驶场景").selectOption("degraded");
  await expect(view).toHaveAttribute("data-time", "4.200");
  await page.getByRole("button", { name: "展开控制台" }).click();
  await page.getByRole("slider", { name: "场景时间" }).fill("7.2");
  await expect(page.locator(".direction")).toHaveAttribute(
    "data-policy",
    "PERCEPTION_LIMITED",
  );
  await page.getByLabel("驾驶场景").selectOption("truck");
  await expect(view).toHaveAttribute("data-time", "2.400");
  await page.getByRole("button", { name: "STORY EXPERIENCE" }).click();
  await page.mouse.move(680, 370);
  await page.mouse.wheel(0, 900);
  await expect(page.locator(".film")).toHaveAttribute("data-playing", "true");
  await page.getByLabel("探索时间轴").click();
  const go = (n: number) => page.getByLabel("影片时间").fill(String(n * 180));
  await go(36 / 180);
  await expect(
    page.getByRole("heading", { name: "Behind the truck." }),
  ).toBeVisible();
  const shot = await view.getAttribute("data-eye");
  await go(0.93);
  await expect(view).toHaveAttribute("data-scene", "cross");
  await go(36 / 180);
  await expect(view).toHaveAttribute("data-eye", shot!);
  await go(0.992);
  await page.getByRole("button", { name: "自动播放" }).click();
  await page
    .getByRole("button", { name: "ENTER LIVE LAB ↗", exact: true })
    .click();
  await expect(page.getByLabel("驾驶场景")).toHaveValue("cross");
});
test("risk-driven wing waits for RSU evidence and retracts after cross traffic clears", async ({
  page,
}) => {
  await page.goto("/?lab");
  const view = page.locator(".view");
  await expect(view).toHaveAttribute("data-ready", "true");
  await page.getByLabel("驾驶场景").selectOption("cross");
  await page.getByRole("button", { name: "展开控制台" }).click();
  const slider = page.getByRole("slider", { name: "场景时间" });
  await slider.fill("0");
  await page.getByLabel("研究投影", { exact: true }).selectOption("auto");
  await expect(view).toHaveAttribute("data-strength", "0.0000");
  await slider.fill("3.2");
  await expect(view).toHaveAttribute("data-strength", "-1.0000");
  await slider.fill("10");
  await expect(view).toHaveAttribute("data-strength", "0.0000");
  await expect(page.locator(".spatial,.direction")).toHaveCount(0);
});
