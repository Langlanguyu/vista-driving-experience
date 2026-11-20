# VISTA · 协同感知驾驶舱

大学课程用协同感知 AR-HUD 仿真。Live Lab 提供货车遮挡、路口横穿和雨雾衰减三个 12 秒场景。Story Experience 通过滚动或自动播放驱动同一座城市中的七章、180 秒影片。所有场景、模型、字体回退和观测均在本机运行。

## Cinematic Final Cut

默认入口停在完整标题。首次向下滚动、上滑或按向下键启动 180 秒影片，随后自动播放。点击 ENABLE SOUND 开启与当前镜头同步的配乐。空格暂停或继续，七个章节点用于跳转，「···」可精确定位，重播会回到标题待机。直接进入实验室使用 `?lab`，普通设备可选 `?quality=low`。

[原创声音与授权](docs/audio-credits.md) · [视觉参考实察](docs/r6-reference-audit.md)

## 本地启动

在项目目录运行（已验证 Node 26.13.1、npm 11.20.0）：

```sh
npm ci
npm run dev
```

打开终端显示的本地地址，默认 http://127.0.0.1:5173 。浏览器需支持 WebGL 2。依赖安装完成后，场景运行不需要外部图片、字体、模型或 CARLA 服务。

## 课堂操作

1. **前车遮挡**初始停在 2.4 s。切换 HUD 对比货厢与三维目标显影。「查看感知原理」冻结当前帧并透出真实车辆，退出恢复先前播放状态。
2. **横向来车**从右上方场景选择器进入，初始停在 3.2 s。先观察左边缘提示，再点「研究投影」。展开控制台可切换 NORMAL、风险联动、固定左/右扩展、同帧 COMPARE，以及左/右来车。「空间观察」可检查实际路口几何。将时间拖回 0 并启用风险联动，可播放发现、扩展、让行与恢复的完整过程。
3. **感知衰减**可拖动至 3.2、5、7.2 和 11.8 s，依次观察估计范围、方向提示、观测过期和恢复。重置后从晴朗开始连续播放。要单独验证雾，在「参数设置」固定雾浓度并关闭链路注入，再切换高、中、低位置质量。也可单独调基础延迟、存在可信度与跟踪稳定性。
4. **Story Experience** 支持鼠标滚轮、触屏或键盘滚动。课堂可直接打开 [Story 入口](http://127.0.0.1:5173/?story)。底部可播放或暂停、选择章节、拖动影片时间、重看本章。顶部 LIVE LAB 返回原实验，再进入 Story 会继续上次进度。片尾可重播或进入当前驾驶场景。
5. 控制台支持播放、暂停、重置、位置质量、座舱、空间观察和链路参数。运行开发服务并打开 `/?debug` 可查看轨迹与判定。离线演示使用本地生产预览。

6. **Projection Research** 位于横向来车场景的控制台。选择 CURRENT、PANNINI 或 STRUCTURE-AWARE，在同一时刻调节翼部强度、中央宽度与结构权重，查看梁缘和车辆包络指标。
7. **Optical Lab** 位于顶部。旋转剖面，切换传播与虚像延长线、改变眼点或等效 VID。Story 的后三章可直接跳至光路揭示、有限视场和中控联动。

## 验证

```sh
npm run typecheck
npm run build
npm test
npm run test:e2e
```

Playwright 在此机使用已有 Google Chrome，其他机器可指定 CHROME_PATH 或先执行 `npx playwright install chromium`。浏览器测试可自动启动开发服务器。生产文件输出到 dist，可用 `npm exec vite preview` 检查。

[技术规格](docs/technical-spec.md) · [视觉规格](docs/product-visual-spec.md) · [开发路线与行业清单](docs/roadmap.md) · [进度](docs/PROGRESS.md) · [工程约束](AGENTS.md) · [材料解读](docs/REFERENCE_ANALYSIS.md)

[Round 2 实拍与性能验证](docs/round2-verification.md) · [资产与许可](docs/assets-license.md) · [Round 1 视觉审查](docs/round2-visual-audit.md)

[Round 3 运行截图、录屏和复测方法](docs/round3-verification.md)

[Round 4 截图、录屏、投影原理与验收](docs/round4-verification.md)

[R4.5 车辆诊断、同眼点座舱对照、大雾实拍与复测](docs/round45-verification.md)

[R5A 七章影片、逐章实拍、录屏与 R5B 接口](docs/round5a-verification.md)

[R5B 运行截图、录屏与定量验收](docs/round5b-verification.md) · [投影研究](docs/projection-research.md) · [光学模型](docs/optical-model.md)

## Preview 发布与离线包

- [R6 成片](https://langlanguyu.github.io/vista-driving-experience/r6/) · [稳定 Preview](https://langlanguyu.github.io/vista-driving-experience/) · [R6 验收](docs/round6-verification.md)
- 仓库 https://github.com/Langlanguyu/vista-driving-experience
- main 分支推送后由 .github/workflows/deploy.yml 自动构建并部署 Pages。
- npm run package:offline 在 macOS 上生成 release/vista-r61.zip。解压后双击 Start VISTA.command，保留终端窗口即可运行。附带 Intel / Apple Silicon 通用本地服务，不需要 Node.js、npm 或 Python。
- Vite 使用相对 base，模型、贴图、HDR 与署名通过 BASE_URL 加载，适配 Pages 仓库子路径与独立离线目录。
- 历史截图、录屏、参考原件和压缩包保留在本地，Git 忽略这些大文件。更新时提交源码与 public 资产即可。
