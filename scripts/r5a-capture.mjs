// Production preview must be listening. Each image comes from Chrome's compositor.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const out = "docs/verification/round5a",
  url = process.env.VISTA_URL ?? "http://127.0.0.1:4173";
const stills = process.argv.includes("--stills");
const cues = [
  [1, "00-prologue"],
  [19, "01-driver"],
  [27, "02-xray"],
  [36, "03-reveal"],
  [51, "04-edge"],
  [60, "05-fold"],
  [69, "05b-crossing-type"],
  [77, "06-precise"],
  [82, "07-estimated"],
  [87, "08-direction"],
  [92, "09-limited"],
  [97, "10-stale"],
  [101.8, "11-reacquire"],
  [102.8, "12-estimate-return"],
  [104.8, "13-precise-return"],
  [124, "14-optical"],
  [153, "15-reality"],
  [167, "16-future"],
  [180, "17-finale"],
];
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  ...(stills
    ? {}
    : { recordVideo: { dir: out, size: { width: 1440, height: 900 } } }),
});
const p = await ctx.newPage(),
  errors = [],
  network = new Set(),
  states = [], models={};
p.on("request",r=>{const path=new URL(r.url()).pathname;if(path.endsWith(".glb"))models[path]=(models[path]??0)+1});
p.on("pageerror", (e) => errors.push(String(e)));
p.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
await p.route("**/*", (route) => {
  if (new URL(route.request().url()).origin !== url) {
    network.add(route.request().url());
    return route.abort();
  }
  return route.continue();
});
try {
  await p.goto(url + "/?story&benchmark");
  await p.locator("[data-ready=true]").waitFor({ timeout: 60000 });
  await p.evaluate(() => {
    window.contextLoss = 0;window.vistaFrames=[];
    document
      .querySelector("canvas")
      .addEventListener("webglcontextlost", () => window.contextLoss++);
  });
  const start = Date.now();
  if (!stills)
    await p.getByRole("button", { name: "自动播放", exact: true }).click();
  for (const [time, name] of cues) {
    if (stills) {
      await p.getByLabel("影片时间").fill(String(time));
      await p.waitForTimeout(180);
    } else
      await p.waitForFunction(
        (sec) =>
          Number(document.querySelector(".film")?.dataset.seconds) >=
          sec - 0.003,
        time,
        { timeout: 30000 },
      );
    await p.screenshot({ path: out + "/" + name + ".png" });
    states.push(
      await p.evaluate(() => ({
        seconds: document.querySelector(".film").dataset.seconds,
        chapter: document.querySelector(".film").dataset.chapter,
        view: { ...document.querySelector(".view").dataset },
        level: document.querySelector(".filmEvidence")?.dataset.level,
      })),
    );
  }
  const elapsed = (Date.now() - start) / 1000;
  if (!stills) await p.getByRole("button", { name: "REPLAY STORY" }).waitFor();
  const lost = await p.evaluate(() => window.contextLoss);
  if (lost || errors.length || network.size)
    throw Error(JSON.stringify({ lost, errors, external: [...network] }));
  if (!stills) {
    const frameTimes=await p.evaluate(()=>{
      const t=window.vistaFrames;
      const intervals=t.slice(1).map((v,i)=>v-t[i]).sort((a,b)=>a-b);
      return {samples:t.length,meanFps:1000*(t.length-1)/(t.at(-1)-t[0]),p95Ms:intervals[Math.floor(.95*intervals.length)]};
    });
    const clip = p.video();
    await ctx.close();
    await clip.saveAs(out + "/VISTA-180s.webm");
    await clip.delete();
    await writeFile(
      out + "/run.json",
      JSON.stringify(
        {
          browser: browser.version(),
          elapsed,models,frameTimes,
          viewport: [1440, 900],
          contextLoss: lost,
          externalRequests: [...network],
          errors,
          states,
        },
        null,
        2,
      ),
    );
  }
  if(stills)await writeFile(out+"/stills.json",JSON.stringify(states,null,2)+"\n");
  console.log(stills ? "Captured stills" : "Completed film", elapsed);
} finally {
  await browser.close();
}
