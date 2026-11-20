import {chromium} from "playwright";
import {mkdir,writeFile} from "node:fs/promises";
const root=process.env.VISTA_URL??"http://127.0.0.1:5173/",label=process.env.VISTA_CHECK??"development";
await mkdir("release/verification",{recursive:true});
const browser=await chromium.launch({channel:"chrome"});
const ctx=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:"block"}),page=await ctx.newPage();
const errors=[],blocked=[],models=new Set(),assets=new Set(),failed=[];
await ctx.route("**/*",route=>{
  const url=new URL(route.request().url());
  if(url.origin!==new URL(root).origin){blocked.push(url.href);return route.abort();}
  return route.continue();
});
page.on("pageerror",e=>errors.push(e.message));
page.on("response",r=>{if(r.ok()) assets.add(new URL(r.url()).pathname.split("/").pop());if(r.status()>=400)failed.push([r.status(),r.url()]);if(r.url().endsWith(".glb")&&r.status()===200)models.add(new URL(r.url()).pathname)});
async function attr(selector,key,value){await page.waitForFunction(({selector,key,value})=>document.querySelector(selector)?.getAttribute(key)===value,{selector,key,value},{timeout:15000})}
try{
 await page.addInitScript(()=>{
   window.vistaAudioSamples=[];
   const start=AudioBufferSourceNode.prototype.start;
   AudioBufferSourceNode.prototype.start=function(...args){
     const buffer=this.buffer;
     if(buffer){
       const samples=buffer.getChannelData(0);let peak=0;
       for(let i=0;i<samples.length;i+=509)peak=Math.max(peak,Math.abs(samples[i]));
       window.vistaAudioSamples.push({duration:buffer.duration,offset:args[1],peak});
     }
     return start.apply(this,args);
   };
 });
 await page.goto(root);await attr(".view","data-ready","true");await attr(".film","data-phase","INTRO_IDLE");await page.mouse.move(600,320);await page.mouse.wheel(0,500);await attr(".film","data-playing","true");
 await page.getByRole("button",{name:"Beyond the frame",exact:true}).click();
 await page.getByRole("button",{name:"ENABLE SOUND",exact:true}).click();
 await page.getByRole("button",{name:"SOUND ON",exact:true}).waitFor();
 await page.getByRole("button",{name:"LIVE LAB ↗",exact:true}).click();
 const audio=await page.evaluate(()=>window.vistaAudioSamples);
 if(!audio.some(x=>x.duration>179&&x.offset>=45&&x.peak>.05)||!audio.some(x=>x.duration<33&&x.peak>.05))throw Error(JSON.stringify(audio));
 await page.goto(root+"?lab");await attr(".view","data-ready","true");
 await attr(".view","data-xray","true");
 await page.getByRole("button",{name:"HUD ON",exact:true}).click();await attr(".view","data-xray","false");
 await page.getByRole("button",{name:"HUD OFF",exact:true}).click();
 await page.getByLabel("展开控制台").click();
 for(const [name,policy]of [["中质量","ESTIMATED_TARGET"],["低质量","DIRECTION_ONLY"],["高质量","CONFIRMED_TARGET"]]){
   await page.getByRole("button",{name,exact:true}).click();await attr(".spatial,.direction","data-policy",policy);
 }
 await page.getByLabel("驾驶场景").selectOption("cross");
 await page.getByLabel("研究投影",{exact:true}).selectOption("left");await attr(".view","data-strength","-1.0000");
 await page.getByLabel("研究投影",{exact:true}).selectOption("right");await attr(".view","data-strength","1.0000");
 await page.getByLabel("驾驶场景").selectOption("degraded");await page.getByRole("slider",{name:"场景时间",exact:true}).fill("7.2");await attr(".direction","data-policy","PERCEPTION_LIMITED");
 await page.getByRole("button",{name:"OPTICAL LAB",exact:true}).click();await attr(".view","data-rays","9");
 await page.getByRole("slider",{name:"眼点横移"}).fill("84");await attr(".view","data-rays","0");await page.getByLabel("退出光学实验").click();
 await page.getByRole("button",{name:"STORY EXPERIENCE"}).click();
 await page.getByLabel("探索时间轴").click();
 for(const t of [27,60,97,126,146.5,156,180])await page.getByLabel("影片时间").fill(String(t));
 await page.getByRole("button",{name:"REPLAY STORY",exact:true}).waitFor();
 await page.screenshot({path:"release/verification/"+label+".png"});
 await page.getByRole("button",{name:"ENTER LIVE LAB ↗",exact:true}).click();
 await page.getByLabel("驾驶场景").waitFor();
 for(const asset of ["noon.hdr","daylight-clouds.webp","road-color.webp","forward-motion.m4a","still-air.m4a"]) if(!assets.has(asset)) throw Error("Missing local asset "+asset);
 if(models.size!==4||errors.length||blocked.length||failed.length)throw Error(JSON.stringify({models:[...models],errors,blocked,failed}));
 const result={url:root,browser:browser.version(),externalNetwork:"all non-origin requests blocked before fresh load",models:[...models],assets:[...assets].sort(),errors,blocked,failed,audio,checks:["sound-unlock-seek-lab","world","xray","quality-cycle","adaptive-left-right","degraded","optical-eye-box","seven-story-seeks","return-to-lab"]};
 await writeFile("release/verification/"+label+".json",JSON.stringify(result,null,2));console.log(label+" passed");
}finally{await browser.close()}
