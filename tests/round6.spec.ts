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
  await expect(page.locator(".view")).toHaveAttribute("data-ready", "true", {
    timeout: 45000,
  });
  await page.waitForTimeout(300);
  await expect(film).toHaveAttribute("data-phase", "INTRO_IDLE");
  await expect(film).toHaveAttribute("data-seconds", "0.000");
  await page.mouse.move(640, 300);
  await page.mouse.wheel(0, -900);
  await expect(film).toHaveAttribute("data-phase", "INTRO_IDLE");
  await page.mouse.wheel(0, 900);
  await page.mouse.wheel(0, 6000);
  await expect(film).toHaveAttribute("data-phase", "INTRO_ACTIVATING");
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
  await expect(page.getByText("SOUND READY", { exact: true })).toBeVisible();
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
  await expect(page.getByText("SOUND OFF", { exact: true })).toBeVisible();
  await page.getByText("SOUND OFF", {exact:true}).click();
  await expect(page.getByText("SOUND ON", {exact:true})).toBeVisible();
  await page.reload();
  await expect(film).toHaveAttribute("data-chapter", "0");
});

test("touch threshold, keyboard activation, skip and economy quality", async ({
  page,
}) => {
  await page.goto("/?quality=low");
  await expect(page.locator(".view")).toHaveAttribute("data-ready", "true");
  await expect(page.locator(".view")).toHaveAttribute("data-quality", "low");
  const region = page.getByRole("region"),
    film = page.locator(".film");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 2,
  });
  const swipe = async (end: number) => {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 640, y: 230 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 640, y: end }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  };
  await swipe(224);
  await expect(film).toHaveAttribute("data-phase", "INTRO_IDLE");
  await swipe(150);
  await expect(film).toHaveAttribute("data-playing", "true");
  await page.reload();
  await page.getByRole("button", { name: "跳过序幕 ↗" }).click();
  await expect(film).toHaveAttribute("data-chapter", "1");
  await page.getByRole("button", { name: "Prologue", exact: true }).click();
  await expect(film).toHaveAttribute("data-phase", "INTRO_IDLE");
  await region.press("ArrowDown");
  await expect(film).toHaveAttribute("data-phase", "INTRO_ACTIVATING");
});

test("denied sound can retry, idle and replay have no live voice", async ({ page }) => {
  await page.addInitScript(() => {
    const resume = AudioContext.prototype.resume;
    let deny = true;
    AudioContext.prototype.resume = function () {
      if (deny) {
        deny = false;
        return Promise.reject(new DOMException("gesture required", "NotAllowedError"));
      }
      return resume.call(this);
    };
  });
  await page.goto("/");
  const sound = page.locator(".soundControl button");
  await sound.click();
  await expect(sound).toHaveText("ENABLE SOUND");
  await expect(page.getByRole("status")).toBeVisible();
  await sound.click();
  await expect(sound).toHaveText("SOUND READY");
  await page.getByRole("region").press("ArrowDown");
  await expect(sound).toHaveText("SOUND ON");
  await page.getByLabel("探索时间轴").click();
  await page.getByLabel("影片时间").fill("180");
  await expect(sound).toHaveText("SOUND READY");
  await page.getByRole("button", {name:"REPLAY STORY"}).click();
  await expect(page.locator(".film")).toHaveAttribute("data-phase","INTRO_IDLE");
  await expect(sound).toHaveText("SOUND READY");
  await page.getByRole("region").press("ArrowDown");
  await expect(sound).toHaveText("SOUND ON");
  await sound.click();
  await expect(sound).toHaveText("SOUND OFF");
  await page.getByRole("button",{name:"LIVE LAB ↗",exact:true}).click();
  await expect(sound).toHaveText("SOUND OFF");
});
