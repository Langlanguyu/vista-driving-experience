import { test, expect } from "@playwright/test";

test("default film waits for assets, unlocks real audio at film time and preserves Lab sound", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const starts: number[] = [];
    const native = AudioBufferSourceNode.prototype.start;
    Object.assign(window, { audioStarts: starts });
    AudioBufferSourceNode.prototype.start = function (
      when = 0,
      offset = 0,
      duration?: number,
    ) {
      starts.push(offset);
      return duration === undefined
        ? native.call(this, when, offset)
        : native.call(this, when, offset, duration);
    };
  });
  let resume!: () => void;
  const gate = new Promise<void>((resolve) => (resume = resolve));
  await page.route("**/cargo.glb", async (request) => {
    await gate;
    await request.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const film = page.locator(".film");
  await expect(film).toHaveAttribute("data-seconds", "0.000");
  await expect(film).toHaveAttribute("data-playing", "false");
  resume();
  await expect(film).toHaveAttribute("data-playing", "true", {
    timeout: 45000,
  });
  await expect(page.getByLabel("影片时间")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "章节跳转" }).getByRole("button"),
  ).toHaveCount(7);
  await page
    .getByRole("button", { name: "Beyond the frame", exact: true })
    .click();
  const starts = () =>
    page.evaluate(
      () => (window as unknown as { audioStarts: number[] }).audioStarts,
    );
  expect(await starts()).toEqual([]);
  await page.getByText("ENABLE SOUND", { exact: true }).click();
  await expect(page.getByText("SOUND ON", { exact: true })).toBeVisible();
  await expect
    .poll(async () => (await starts()).at(-1))
    .toBeGreaterThanOrEqual(45);
  await page.getByLabel("暂停叙事").click();
  const paused = Number(await film.getAttribute("data-seconds"));
  await page.getByLabel("自动播放").click();
  await expect
    .poll(async () => Math.abs((await starts()).at(-1)! - paused))
    .toBeLessThan(0.4);
  await page.getByRole("button", { name: "LIVE LAB ↗", exact: true }).click();
  await expect.poll(async () => (await starts()).at(-1)).toBe(0);
  await page.getByRole("button", { name: "STORY EXPERIENCE" }).click();
  await expect
    .poll(async () => (await starts()).at(-1))
    .toBeGreaterThanOrEqual(45);
  await page.getByText("SOUND ON", { exact: true }).click();
  await expect(page.getByText("ENABLE SOUND", { exact: true })).toBeVisible();
  await page.reload();
  await expect(film).toHaveAttribute("data-chapter", "0");
});
