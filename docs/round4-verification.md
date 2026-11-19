# R4 v2.0 · 同眼点投影与侧向风险

**课堂入口**　在 Live Lab 右上方选「02 横向来车」。停在 3.2 s，观察左边缘警示，点「研究投影」。左侧转角和横车进入画面，正前方铁路桥仍在原位。「恢复标准投影」可反向比较。抽屉中的 COMPARE 同时显示同一时刻的两种投影。手动选右侧来车与 ADAPTIVE RIGHT 可复现镜像场景。

## 网页实拍

| 检查 | 实际 Chrome 画面 |
| --- | --- |
| 眼点固定、两翼扩展与真实侧街 | [标准](verification/round4/01-normal.png) · [左侧扩展](verification/round4/02-left.png) · [同帧标准/研究对照](verification/round4/03-compare.png) · [右侧扩展](verification/round4/04-right.png) · [路口空间观察](verification/round4/05-junction.png) |
| 货车遮挡、三维显影与揭示 | [关闭 HUD](verification/round4/06-occluded.png) · [GLB 显影](verification/round4/07-xray.png) · [教学揭示](verification/round4/08-reveal.png) · [同区域放大](verification/round4/xray-detail.jpg) |
| 雨雾与通信中断 | [位置降级](verification/round4/09-fog.png) · [观测过期](verification/round4/10-limited.png) |
| 滚动镜头 | [外景](verification/round4/11-exterior.png) · [进入座舱途中](verification/round4/12-enter.png) · [空间显影](verification/round4/13-perception.png) · [路口扩展](verification/round4/14-awareness.png) · [逆向回到同一进度](verification/round4/15-reverse.png) |

[录屏 A · 侧向风险与扩展](verification/round4/A-cross-traffic.webm) · [录屏 B · 空间显影、教学揭示、返回及雨雾切换](verification/round4/B-spatial-xray.webm) · [录屏 C · 正反滚动与实验接管](verification/round4/C-scroll-story.webm)。视频由 Playwright 采集 Chromium 合成画面，规格为 1440×900、25 FPS。截图原图保持完整，总览和细节图由原图排版或裁切。

## 投影实现与选择

标准镜头水平 88°。单侧扩展时，驾驶员的 ENU 眼点、偏航、俯仰和正前方透视焦距均保持。渲染器在选中一侧移开离轴视锥的边界，以一次街区渲染将更多真实几何写入 HDR RenderTarget。全屏片元按连续函数重采样。标准路口与扩展路口共用相同的颜色输出，阴影、雾和背景保持一致。

设显示横坐标为 u∈[−1,1]，带符号扩展强度为 a∈[−1,1]。采样的标准透视平面横坐标为

```text
d = max(sign(a) × u − 0.28, 0)
x = u + a × k × d²
k = (1 / 0.24 − 1) / (2 × 0.72)
```

中心约 ±15.13° 使用恒等映射。侧翼边界从 44° 延伸至约 64.18°，另一侧仍为 44°。0.24 是最大扩展时边缘沿标准透视平面坐标的局部缩放。接合处一阶导数连续，横向导数始终为正。外围运行有界的纵向重映射，以减少横车在视野边缘的纵向拉长。HUD 通过解析逆变换投影估计中心和地面轮廓样点。手动投影切换约 620 ms，Story 模式直接使用滚动进度。

Pannini 与局部适应投影提供广角变形的研究背景。本项目采用中心恒等、单翼可逆的函数。备选同眼点多方向渲染可覆盖更大的角域，当前所有验收目标均在眼点前半空间，因此选单个离轴视锥。六面方案未做性能对跑。[Pannini 论文](https://diglib.eg.org/server/api/core/bitstreams/8e4c4755-e33a-4ea6-8dbd-44c5780d7307/content) · [Locally Adapted Projections](https://johanneskopf.de/publications/projection/) · [Godot360](https://github.com/Cykyrios/Godot360) · [Three.js CubeCamera](https://threejs.org/docs/pages/CubeCamera.html)

## 遮挡与显示依据

货车写入 stencil 标记，估计车体使用与真车共享几何的 GLB 克隆。局部深度预通过为车身、轮胎与玻璃保留自身遮挡，后续着色根据表面法线、观察方向和部件类别生成体积明暗。在部分遮挡时，显影只覆盖受货车模板约束的像素。正常驾驶保持货车实体材质；教学揭示暂停场景并恢复对真实前后车辆的可见性。设计比较了全屏 Outline 与局部模板，在本场景选择后者以保留车型内部表面细节。[React Postprocessing](https://github.com/pmndrs/react-postprocessing) · [Drei Mask](https://drei.docs.pmnd.rs/portals/mask)

雨雾场景使用独立的同车道轨迹。可沿时间轴依次检查确认、估计、仅方向、感知受限与恢复。横向场景另有驶离后的 NO_WARNING。跟踪稳定性、存在评分、横向位置误差、消息年龄和冲突区到达时间有独立含义。容量与人因阈值为仿真设定。[参数与定义](technical-spec.md)

## 叙事与浏览器回归

叙事的外部跟车、入舱、目标视差和路口镜头使用同一世界。原生 scrollTop 确定仿真时间、眼点、朝向、章节、显影和侧翼扩展量。滚动反向回到 48% 时，道路中央截取区域与正向截图逐像素一致。自动模式推进同一滚动位置并在结束时交回实验。网页交互参考了滚动与 WebGL 同步的实现思路及分段文字入场。[r3f-scroll-rig](https://github.com/14islands/r3f-scroll-rig) · [Codrops 文字动效](https://tympanus.net/codrops/2020/06/17/making-stagger-reveal-animations-for-text/)

- TypeScript 检查与 Vite 生产构建通过。主 JS gzip 约 381 kB，Vite 仍报告单包体积提醒。
- 13 项领域测试通过，覆盖映射单调、解析逆变换、中央保持、镜像、遮挡、质量迟滞、预设与手动丢包重叠、可重复恢复、TTC 和叙事接管处眼点连续性。
- 6 项浏览器测试通过，包括既有播放/暂停、观察、世界锚点往返、教学恢复，以及新增场景切换、左右投影、风险触发与自动收回、滚动正反向和自动播放接管。
- 3.2 s 左右镜像各放置一枚开发模式 WebGL 标定球，从 Chrome 实拍像素中求球心，与独立 SVG 投影锚点比较。两次偏差为 **0.17 / 0.11 CSS px**。此值仅说明特定模拟点在这两次渲染中的配准。
- 标准与左扩展实拍对照，中央桥梁与街区范围 x=[550,890)、y=[170,625) 的平均绝对 RGB 通道差为 1.57 / 1.44 / 1.40（8 位）。CPU 几何映射在保留区精确恒等，光栅结果受采样分辨率与抗锯齿影响。[测量记录](verification/round4/visual-checks.json)

## 本机性能

Apple M4、16 GB，Chrome 157.0.8103.79，ANGLE Metal。生产预览为 1440×900、DPR 1，控制台展开。每个条件采样一遍第 1–11 秒的 R3F 帧时间戳。首载、录屏和高 DPR 未计入。

| 场景 | 投影 | 采样帧数 | 平均 FPS | P95 帧间隔 |
| --- | --- | ---: | ---: | ---: |
| 货车遮挡 | normal | 600 | 60.0 | 17.6 ms |
| 横向路口 | normal | 599 | 60.0 | 17.5 ms |
| 横向路口 | left | 600 | 60.0 | 17.6 ms |
| 横向路口 | right | 600 | 60.0 | 17.5 ms |
| 横向路口 | compare | 599 | 60.0 | 17.6 ms |
| 雨雾 | normal | 600 | 60.0 | 17.5 ms |

[每次采样及 GPU 原始记录](verification/round4/performance.json)

## 复测与后续

在项目目录运行 npm run dev。另一个终端运行 npm run typecheck、npm test、npm run test:e2e。node scripts/r4-capture.mjs 保存截图和三段 WebM，需要本机 Chrome 与 Playwright FFmpeg。运行 npm run build 和 npm exec vite preview 后，node scripts/benchmark.mjs 可复测生产渲染，VISTA_URL 可指定本地服务。

[R3 可恢复源码与运行资产包](verification/round4/r3-source.tgz) 含 R3 源码、资产、锁文件、测试、工具和当时的文档。可在空目录解包并执行 npm ci、npm run dev 重现 R3。

本轮范围为前半空间的单侧上下文扩展。外围几何仍有压缩，真实车辆尺寸、定位精度、碰撞概率及驾驶人理解成本需另行测量。R5 将基于已实现的雨雾降级样例接入环境驱动的对比度、轮廓与光学路径，R6 保留三分钟整合演示。
