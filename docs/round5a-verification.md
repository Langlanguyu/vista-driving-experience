# R5A · 三分钟驾驶感知影片

从 [Story 入口](http://127.0.0.1:5173/?story) 进入影片；根路径继续打开 Live Lab。局域或离线演示可在项目目录运行 `npm run dev`，生产预览使用 `npm run build`、`npm exec vite preview`，在预览地址后加 `/?story`。全部网格、HDR 与纹理从本机加载。

[完整浏览器录屏](verification/round5a/VISTA-180s.webm) · [七章实拍](verification/round5a/chapters.jpg) · [五级证据对照](verification/round5a/evidence.jpg) · [运行采样](verification/round5a/run.json) · [视觉研究](r5a-motion-research.md)

|影片秒|章节与观测重点|浏览器原帧|
|---|---|---|
|0–15|真实街景从字形与斜向开口中显露，摄影机由车外进入眼点，HUD 关闭。|[Prologue](verification/round5a/00-prologue.png)|
|15–43|普通前视建立遮挡，按路侧估计绘制三维车体，再沿货车侧面检查真实车位。|[正常视图](verification/round5a/01-driver.png) · [X-Ray](verification/round5a/02-xray.png) · [教学侧视](verification/round5a/03-reveal.png)|
|43–75|同一驾驶眼点先见方位警示，再引入实际左侧道路。目标横穿置于路口远侧的影片字形，深度缓冲决定遮挡。|[边缘警示](verification/round5a/04-edge.png) · [空间展开](verification/round5a/05-fold.png) · [横穿构图](verification/round5a/05b-crossing-type.png)|
|75–105|冻结同一构图比较前三档定位，随后演示有效依据不足、链路过期与分步恢复。|[五级图版](verification/round5a/evidence.jpg)|
|105–135|从驾驶舱提取同一块玻璃，抬起网格、显出边缘并标出眼点与风挡曲面。|[模型剖视转场](verification/round5a/14-optical.png)|
|135–163|回装座舱，在同一视点以分界线对照数字空间展开与正常透视，解释透明风挡的显示边界。|[双状态对照](verification/round5a/15-reality.png)|
|163–180|从未来座舱的信息分工回到车辆外景，保留品牌收尾、重播和 Lab 入口。|[座舱](verification/round5a/16-future.png) · [片尾](verification/round5a/17-finale.png)|

## 雾区复现

|影片秒|策略与数据依据|实际空间表达|
|---|---|---|
|77|F-03，新鲜路侧定位，小横向 σ|[车形与稳定锚点](verification/round5a/06-precise.png)|
|82|同一眼点、道路位置与目标，增大源定位误差|[撤除车形，显示虚线估计区](verification/round5a/07-estimated.png)|
|87|定位不足，仍有存在与方位证据|[仅方位符号](verification/round5a/08-direction.png)|
|92|雾区教学预设同时注入弱存在依据，仍有未过期样本|[感知受限，无法确认通路](verification/round5a/09-limited.png)|
|97|独立链路故障，最新已到达样本的年龄超过 1.5 s|[时钟符号，撤除位置、旧 TTC](verification/round5a/10-stale.png)|
|100–105|先接到新包，再恢复跟踪和定位|[方向](verification/round5a/11-reacquire.png) → [范围](verification/round5a/12-estimate-return.png) → [车形](verification/round5a/13-precise-return.png)|

教学的 D、E 同属底层 PERCEPTION_LIMITED。画面用样本年龄区分依据薄弱与过期。能见度、位置质量、存在可信度和链路按独立实验输入处理。高风险但低定位质量时仍可提供方向提醒。上述阈值与故障为仿真设定。

## R5B 接入

在 `src/scenes/story.ts` 中，opticalScene、realityComparison、cockpitFuture 接收各章 0–1 进度并返回可逆的展示状态。Drive、StreetWorld、ProjectionPass 已消费这些状态。后续分别接入经标定的 PGU/反射镜/风挡光路，带出处的 FOV、VID、眼盒与有效显示范围，以及中控分工。当前章节展示实际模型的空间关系和数字比较；实体光机、量产显示性能、可测人因收益仍待标定与验证。

## 复测

```sh
npm run typecheck
npm run build
npm test
npm run test:e2e
# 独立终端运行 npm exec vite preview 后
node scripts/r5a-capture.mjs
```

录制脚本使用本机 Chrome 的真实时间自动播放，按影片时间采样 19 个浏览器画面，保存整段 WebM 及上下文丢失、资源请求和状态记录。加 --stills 可快速逐点检查构图。单元测试验证相机接缝、镜像投影、过期边界与五级恢复。浏览器测试验证滚轮正反向、章节直达、暂停/继续、重看本章、片尾重播、往返 Lab、同一个 Canvas 和原实验回归。性能采样包括录制及截图开销。

## 本机验收结果

2026-11-20，Apple M4，Chrome 157.0.8103.79，生产预览 1440 × 900、DPR 1。播放按钮到采集片尾约 180.54 s。录屏文件含页面载入及片尾采集，共 3:02，VP9、25 FPS。19 张 PNG 在同一生产构建逐点暂停采集，避免连续录屏时截屏编码跨过短暂的恢复阶段。[静帧时刻与状态](verification/round5a/stills.json)

- TypeScript 和生产构建通过。主 JS 为 1.33 MB，gzip 约 389 kB，Vite 仍提示单块偏大。
- 19/19 单元测试、10/10 Chrome 交互测试通过。独立 GPU 标记对比 HUD 的左右配准偏差分别为 0.129、0.025 CSS px。
- 全程没有页面错误、外部请求或 WebGL 上下文丢失。四个 GLB 各请求一次。
- 边录屏、截图、运行其他 Chrome 验收时，R3F 回调采样 7549 帧，平均 41.9 FPS，帧间隔 P95 为 35.1 ms。此数值适用于这次录制工况。车辆尺寸、链路时延与风险阈值仍使用课程仿真设定。
