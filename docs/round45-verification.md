# R4.5 · 渲染与感知基础验收

2026-11-20，Mac M4、Chrome 157、1440 × 900、DPR 1。运行图来自本机 WebGL 页面；模型诊断页由 Playwright 临时载入，独立座舱黑底为开发验收通道。单图均可打开原始 PNG。

## 车辆比例

![原模型、旧注册、等比注册及驾驶镜头](verification/round45/vehicles.jpg)

A. [原始 Car Concept](verification/round45/model-coupe-raw.png) 与[原始货车](verification/round45/model-cargo-raw.png)使用标准透视。诊断记录了源网格 26 个小客车节点、25 个货车节点的父节点名、局部和世界 scale。货车有 21 个原始节点自带非等比缩放，装配时保留作者矩阵。小客车原始包络为宽 2.5423、高 1.1489、长 4.3574 个源单位；货车为 12.1226、14.5030、36.3996。[逐节点原始记录](verification/round45/models.json)

旧目标车注册按宽、高、长分别乘约 0.716、1.262、1.010；车尾在标准透视下已显得偏高。现以车长等比注册，按最终朝向求顶点包络，落地、居中后将车头对准 −Z。道路运动与航向施加在单位缩放的外父节点。[旧三轴注册重现](verification/round45/model-coupe-legacy.png) · [等比注册](verification/round45/model-coupe-uniform.png)

|当前装配，世界顶点包络|长 m|宽 m|高 m|
|---|---:|---:|---:|
|目标车、故事自车、两辆停放车、显影网格|4.400|2.567|1.160|
|货车底盘|7.400|2.465|2.948|
|底盘、货厢及附件|7.516|2.620|3.635|

B / C. 在同一横穿片段 **6.8 s**、同眼点、HUD 关闭时，切换正常与左扩展，可看见同一辆红车处在中央保留区与压缩翼部的交界。模型的物理尺寸固定，映射改变外围图像的局部放大率。保留概念车原有的宽低姿态，注册长度为仿真设定。[场景标准透视](verification/round45/vehicle-cross-normal.png) · [同帧自适应](verification/round45/vehicle-cross-left.png) · [真实装配尺寸](verification/round45/instances.json)

## 独立座舱与非对称投影

![同眼点街景与座舱单通道](verification/round45/projection.jpg)

3.2 s 的眼点在 ENU 中为 (−0.300, 77.800, 1.380) m，偏航 0、俯仰 0.015 rad，正常水平 FOV 88°。同一个离轴眼点取到额外横街。中央归一化横坐标 ±0.28 内保持标准透视，翼部垂直映射按水平角雅可比校正，在过渡带平滑接合。右侧镜像。Compare 从一次世界曝光取标准与左扩展两个中心裁片；每片按对应投影计算 HUD。[Normal](verification/round45/street-normal.png) · [Left](verification/round45/street-left.png) · [Right](verification/round45/street-right.png) · [Compare](verification/round45/street-compare.png) · [四种模式眼点](verification/round45/poses.json)

黑底通道保留正常 RGBA 座舱，包括顶框、A 柱、方向盘与仪表台。Playwright 隐藏 DOM 操作层后，比较三种模式完整 1440 × 900 浏览器 PNG，Normal 与左右扩展均完全一致。街景使用不同的纹理采样格，中央轮廓保持位置，边缘像素会有过滤差异。另用 GPU 球心与 HUD 锚点独立比对，左右误差分别为 0.129、0.025 CSS px。[座舱标准](verification/round45/cabin-normal.png) · [座舱左扩展](verification/round45/cabin-left.png) · [座舱右扩展](verification/round45/cabin-right.png)

## 真实场景切换与感知时序

[01 前车遮挡](verification/round45/01-truck.png) · [目标驶出遮挡](verification/round45/truck-emergence.png) · [02 横向路口](verification/round45/street-left.png) · [03 雾区](verification/round45/fog-direction.png) · [故事外景](verification/round45/story-exterior.png)

![大雾固定输入和通信故障的浏览器对照](verification/round45/perception.jpg)

从雾区控制台重置后播放。下表为预设的可重放仿真读数。相机能见度为归一化教学指标，消息年龄按采样时刻计算。重新收到消息时，位置质量与跟踪仍需恢复。

|片段时间|相机能见度|消息年龄|横向 σ|实际显示|
|---|---:|---:|---:|---|
|0 s|100%|100 ms|0.15 m|[确认，三维轮廓与锚点](verification/round45/fog-clear.png)|
|3.2 s|48%|100 ms|0.85 m|[估计区域](verification/round45/fog-estimate.png)|
|5.0 s|10%|300 ms|1.33 m|[方向提示](verification/round45/fog-direction.png)|
|7.2 s|10%|2100 ms|无有效位置|[感知受限，撤除锚点和过期 TTC](verification/round45/fog-expired.png)|
|8.45 s|15%|150 ms|1.25 m|[已收新包，仍为方向提示](verification/round45/fog-reacquire.png)|
|8.9 s|29%|100 ms|1.04 m|[重新跟踪，估计区域](verification/round45/fog-retrack.png)|
|11.8 s|100%|100 ms|0.15 m|[恢复确认显影](verification/round45/fog-recovered.png)|

固定 5 s、雾浓度 100%、基础延迟 80 ms，关闭预设链路故障，仅改变位置质量，即可复现[高](verification/round45/fog-dense-confirmed.png)、[中](verification/round45/fog-dense-estimated.png)、[低](verification/round45/fog-dense-direction.png)三档。相反，晴朗且位置质量良好也能通过传输延迟或丢包独立进入受限状态。可靠横穿观测确认冲突解除时才输出 NO_WARNING。

## 运行检查

|检查|结果|
|---|---|
|npm run typecheck / npm run build|通过。生产主 JS 约 1.32 MB，gzip 约 384 kB，Vite 有大块提示。|
|npm test|16/16。覆盖源层级与等比尺度、转向/落地、角域与连续性、横穿风险、数据新鲜度、雾/链路独立性、迟滞及回放。|
|npm run test:e2e|9/9。Chrome 实测投影配准、座舱像素、目标尺寸、三场景、教学揭示/恢复、反向滚动、Story 往返保留实验，以及从观察镜头切换后活动相机的实际航向。|
|生产预览连续播放|本机六种工况各取约 10 s 的 R3F 帧间隔。平均 59.4–60.0 FPS，P95 为 17.1–18.6 ms。样本不含首次载入。|

[逐工况计时与 GPU 记录](verification/round45/performance.json)。可用 npm run dev 启动后运行 node scripts/r45-capture.mjs 重新采集 PNG 与模型测量。另启动 npm exec vite preview，再运行 node scripts/benchmark.mjs 测量生产版本。性能结果限于该设备、浏览器、分辨率及采样区间。

## 本轮修改文件

|职责|相对仓库路径|
|---|---|
|车型和世界装配|src/rendering/vehicleModel.ts、StreetWorld.tsx、src/data/corridor.json|
|投影与 HUD|src/domain/adaptiveProjection.ts、src/rendering/ProjectionPass.tsx、Drive.tsx、SpatialHUD.tsx|
|相机与两种体验|src/rendering/CameraController.tsx、src/scenes/story.ts、src/app/useSceneController.ts、useTimelineController.ts、main.tsx|
|感知、时序与控制|src/scenes/corridor.ts、src/domain/displayPolicy.ts、types.ts、src/components/FogControls.tsx、src/styles/main.css|
|复测和证据|tests/domain.test.ts、tests/round45.spec.ts、scripts/model-study.ts、r45-capture.mjs、benchmark.mjs、docs/verification/round45/|
|说明与交接|AGENTS.md、README.md、docs/ARCHITECTURE.md、DECISIONS.md、PROGRESS.md、ACCEPTANCE.md、technical-spec.md、assets-license.md、roadmap.md、round45-verification.md|

## R5A 入口与限制

从 src/scenes/story.ts 扩展现有约 22 秒原型，将 180 秒分镜映射到场景、局部时刻、相机位姿、投影和感知预设。先接入上述雾区关键帧，再验收正反向拖动与 Lab 恢复；保留现有控制器和独立座舱通道。R5B 负责光学和环境实景约束，R6 负责全程回归与最终打磨。

翼部投影固有局部压缩，近距离长车跨过中央与翼部仍可察觉弯曲。项目使用原概念车，车型尺寸和可见性/时延为课程仿真参数；实车配准、光学与驾驶员主观接受度仍需单独验证。
