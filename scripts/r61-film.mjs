import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const out = "docs/verification/r61/production",
  url = process.env.VISTA_URL ?? "http://127.0.0.1:4187/";
await mkdir(out, { recursive: true });
const b = await chromium.launch({ channel: "chrome" });
try {
  const ctx = await b.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: out, size: { width: 1440, height: 900 } },
  });
  const p = await ctx.newPage(),
    errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  // Capture the application's actual post-volume Web Audio output.
  await p.addInitScript(() => {
    const connect = AudioNode.prototype.connect,
      start = AudioBufferSourceNode.prototype.start;
    AudioNode.prototype.connect = function (dst, ...rest) {
      if (dst instanceof AudioDestinationNode && !window.filmRecorder) {
        const stream = this.context.createMediaStreamDestination();
        connect.call(this, stream);
        const rec = new MediaRecorder(stream.stream, {
            mimeType: "audio/webm;codecs=opus",
          }),
          chunks = [];
        rec.ondataavailable = (e) => chunks.push(e.data);
        window.filmRecorder = rec;
        window.filmAudio = new Promise(
          (resolve) =>
            (rec.onstop = () => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result.split(",")[1]);
              reader.readAsDataURL(new Blob(chunks));
            }),
        );
      }
      return connect.call(this, dst, ...rest);
    };
    AudioBufferSourceNode.prototype.start = function (...args) {
      if (
        this.buffer?.duration > 179 &&
        window.filmRecorder?.state === "inactive"
      )
        window.filmRecorder.start();
      return start.apply(this, args);
    };
  });
  await p.goto(url);
  await p.waitForSelector("[data-ready=true]");
  await p.getByText("ENABLE SOUND", { exact: true }).click();
  await p.getByText("SOUND ON", { exact: true }).waitFor();
  // The slate exists only before activation and is trimmed from the final cut.
  await p.addStyleTag({
    content:
      '.film[data-phase="INTRO_IDLE"]::after{content:"";position:fixed;left:0;top:0;width:32px;height:32px;background:#ff00ff;z-index:100}',
  });
  await p.waitForTimeout(500);
  await p.mouse.move(620, 310);
  await p.mouse.wheel(0, 280);
  await p.waitForSelector("[data-phase=INTRO_ACTIVATING]");
  await p.waitForFunction(
    () => document.querySelector(".film").dataset.phase === "STORY_FINISHED",
    null,
    { timeout: 210000 },
  );
  await p.waitForTimeout(420);
  const audio = await p.evaluate(async () => {
    window.filmRecorder.stop();
    return await window.filmAudio;
  });
  await writeFile(out + "/browser-audio.webm", Buffer.from(audio, "base64"));
  const video = p.video();
  await ctx.close();
  await video.saveAs(out + "/browser-film.webm");
  console.log({ errors });
  if (errors.length) process.exitCode = 1;
} finally {
  await b.close();
}
