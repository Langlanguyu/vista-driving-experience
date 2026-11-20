import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const out="docs/verification/r62/opening";
await mkdir(out,{recursive:true});
const b=await chromium.launch({channel:"chrome"});
try {
  for (const type of ["aperture","sculpture"]) {
    const ctx=await b.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out+"/raw",size:{width:1440,height:900}}});
    const page=await ctx.newPage();
    page.on("pageerror",e=>{console.error(e);process.exitCode=1;});
    await page.goto("http://127.0.0.1:5192/?type="+type);
    await page.waitForSelector("[data-ready=true]");
    await page.mouse.move(640,300);
    await page.mouse.wheel(0,220);
    await page.waitForFunction(()=>+document.querySelector(".film").dataset.seconds>8.3);
    const video=page.video();
    await ctx.close();
    execFileSync(process.env.FFMPEG??"ffmpeg",["-y","-loglevel","error","-sseof","-8","-i",await video.path(),"-an","-c:v","libx264","-pix_fmt","yuv420p",out+"/"+type+".mp4"]);
  }
} finally {await b.close();}
