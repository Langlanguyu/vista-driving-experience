import {cpSync,mkdirSync,writeFileSync,chmodSync,readdirSync,readFileSync,statSync,existsSync,renameSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
const out="release/vista-r62";
if(existsSync(out)) renameSync(out,out+"-previous-"+Date.now());
mkdirSync(out+"/site",{recursive:true});
cpSync("dist",out+"/site",{recursive:true});
execFileSync("/usr/bin/clang",["-Wall","-Wextra","-O2","-arch","arm64","-arch","x86_64","-mmacosx-version-min=11.0","scripts/offline-server.c","-o",out+"/vista-server"],{stdio:"inherit"});
writeFileSync(out+"/Start VISTA.command",'#!/bin/zsh\ncd -- "$(dirname -- "$0")"\nexec ./vista-server "$PWD/site"\n');
chmodSync(out+"/Start VISTA.command",0o755);
cpSync("docs/audio-credits.md",out+"/AUDIO-CREDITS.md");
cpSync("public/assets/credits.txt",out+"/ASSET-CREDITS.txt");
cpSync("scripts/offline-server.c",out+"/offline-server.c");
writeFileSync(out+"/README.txt",`VISTA Cinematic Final Cut — macOS 离线版

将 ZIP 完整解压到一个文件夹，双击 Start VISTA.command。
浏览器会打开本机地址。保持终端窗口开启，按 Control-C 停止服务。
无需 Node.js、npm、Python 或互联网。支持 macOS 11+，Intel 和 Apple Silicon。
需要支持 WebGL 2 的现代浏览器。首次向下滚动、上滑或按向下键开始播放，点击 ENABLE SOUND 开启声音。地址末尾加 ?lab 可进入实验室。

如果 macOS 首次打开时提示安全限制，请先核对文件来源，
在“系统设置 → 隐私与安全性”中允许本次打开。
也可以在终端进入解压目录后运行：
  zsh "./Start VISTA.command"

服务只监听 127.0.0.1，自动选择可用端口。每次启动端口可能不同。
光学参数、观测轨迹及性能均为课程概念验证，请参阅界面技术说明。
资产署名及许可见 ASSET-CREDITS.txt 与 site/assets/credits.txt。
第三方软件许可见 THIRD-PARTY-LICENSES.txt。
`);
const lock=JSON.parse(readFileSync("package-lock.json","utf8")), notices=[];
for(const [name,meta] of Object.entries(lock.packages)){
  if(!name||meta.dev)continue;
  try{
    const licenses=readdirSync(name).filter(x=>/^(license|copying)(\.|$)/i.test(x));
    for(const file of licenses)if(statSync(name+"/"+file).isFile())notices.push(name+" "+(meta.version??"")+"\n"+readFileSync(name+"/"+file,"utf8"));
  }catch{}
}
writeFileSync(out+"/THIRD-PARTY-LICENSES.txt",notices.join("\n\n----------------\n\n"));
const hashes=[];
function walk(dir){for(const name of readdirSync(dir)){const p=dir+"/"+name;if(statSync(p).isDirectory())walk(p);else if(name!=="SHA256SUMS.txt")hashes.push(createHash("sha256").update(readFileSync(p)).digest("hex")+"  "+p.slice(out.length+1));}}
walk(out);writeFileSync(out+"/SHA256SUMS.txt",hashes.join("\n")+"\n");
execFileSync("/usr/bin/ditto",["-c","-k","--keepParent",out,"release/vista-r62.zip"],{stdio:"inherit"});
console.log("Packaged "+out+" and release/vista-r62.zip");
