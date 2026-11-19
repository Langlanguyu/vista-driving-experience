// Run against a local Vite server. All frames come from Chromium's compositor.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
const out = "docs/verification/round4",
  url = process.env.VISTA_URL || "http://127.0.0.1:5173";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" }),
  errors = [];
const video = process.env.VISTA_STILLS !== "1";
async function session(name, fn) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    ...(video
      ? { recordVideo: { dir: out, size: { width: 1440, height: 900 } } }
      : {}),
  });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const btn = (n) => p.getByRole("button", { name: n, exact: true }),
    wait = (ms) => p.waitForTimeout(ms);
  const shot = async (n) => {
    await wait(450);
    await p.screenshot({ path: out + "/" + n + ".png" });
  };
  const setScene = (n) => p.getByLabel("驾驶场景").selectOption(n);
  const controls = async (fn) => {
    await btn("展开控制台").click();
    await fn();
    await btn("收起控制台").click();
    await wait(750);
  };
  await p.goto(url);
  await p.locator("[data-ready=true]").waitFor();
  await wait(700);
  try {
    await fn({ p, btn, wait, shot, setScene, controls });
  } finally {
    const film = p.video();
    await ctx.close();
    if (film) {
      await film.saveAs(out + "/" + name + ".webm");
      await film.delete();
    }
  }
}
try {
  await session(
    "A-cross-traffic",
    async ({ p, btn, wait, shot, setScene, controls }) => {
      await setScene("cross");
      await wait(3000);
      await shot("01-normal");
      await btn("研究投影").click();
      await wait(1100);
      await shot("02-left");
      await btn("播放").click();
      await wait(1100);
      await btn("恢复标准投影").click();
      await wait(900);
      await btn("暂停").click();
      await controls(async () => {
        await p.getByRole("slider", { name: "场景时间" }).fill("3.2");
        await p.getByLabel("研究投影", { exact: true }).selectOption("compare");
      });
      await shot("03-compare");
      await controls(async () => {
        await p.getByLabel("研究投影", { exact: true }).selectOption("right");
        await p.getByLabel("横向来车", { exact: true }).selectOption("right");
      });
      await shot("04-right");
      await controls(async () => {
        await btn("空间观察").click();
      });
      await shot("05-junction");
    },
  );
  await session(
    "B-spatial-xray",
    async ({ btn, wait, shot, controls, p, setScene }) => {
      await btn("HUD ON").click();
      await wait(650);
      await shot("06-occluded");
      await btn("HUD OFF").click();
      await wait(800);
      await shot("07-xray");
      await btn("查看感知原理").click();
      await wait(1300);
      await shot("08-reveal");
      await btn("退出揭示").click();
      await wait(1200);
      await setScene("degraded");
      await wait(800);
      await shot("09-fog");
      await controls(async () => {
        await p.getByRole("slider", { name: "场景时间" }).fill("7.2");
      });
      await shot("10-limited");
    },
  );
  await session("C-scroll-story", async ({ p, btn, wait, shot }) => {
    await btn("STORY EXPERIENCE").click();
    const scroll = p.getByRole("region", { name: "滚动控制三维镜头" });
    const go = async (value) => {
      await scroll.evaluate((el, v) => {
        el.scrollTo({
          top: (el.scrollHeight - el.clientHeight) * v,
          behavior: "smooth",
        });
      }, value);
      await wait(1150);
    };
    await shot("11-exterior");
    await go(0.19);
    await shot("12-enter");
    await go(0.48);
    await shot("13-perception");
    await go(0.92);
    await shot("14-awareness");
    await go(0.48);
    await shot("15-reverse");
    await go(0.11);
    await btn("进入 LIVE LAB ↗").click();
    await wait(650);
  });
  if (errors.length) throw Error([...new Set(errors)].join("\n"));
} finally {
  await browser.close();
}
