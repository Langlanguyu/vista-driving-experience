import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const out = "docs/verification/r62";
await mkdir(out+"/lab", {recursive:true});
const browser = await chromium.launch({channel:"chrome"});
try {
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto((process.env.VISTA_URL ?? "http://127.0.0.1:5192/")+"?lab");
  await page.waitForSelector("[data-ready=true]");
  await page.getByLabel("展开控制台").click();
  await page.waitForTimeout(400);
  await page.screenshot({path:out+"/lab/controls.jpg",quality:92});
  await page.getByRole("button",{name:"OPTICAL LAB",exact:true}).click();
  await page.waitForTimeout(300);
  await page.screenshot({path:out+"/lab/optics.jpg",quality:92});
  const data = {};
  for (const type of ["aperture","sculpture"]) {
    await page.goto("http://127.0.0.1:5192/?type="+type);
    await page.waitForSelector("[data-ready=true]");
    await page.getByRole("region").press("ArrowDown");
    data[type] = await page.evaluate(()=>new Promise(resolve=>{
      const times=[];
      const loop = now=>{
        times.push(now);
        if (now-times[0]<6500) return requestAnimationFrame(loop);
        const dt = times.slice(1).map((v,i)=>v-times[i]).sort((a,b)=>a-b);
        resolve({meanUpdatesPerSec:1000*dt.length/(now-times[0]),p95Ms:dt[Math.floor(dt.length*.95)],maxMs:dt.at(-1)});
      };
      requestAnimationFrame(loop);
    }));
  }
  await writeFile(out+"/opening/perf.json",JSON.stringify(data,null,2));
} finally {await browser.close();}
