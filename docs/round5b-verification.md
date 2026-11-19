# R5B 运行验收

在现有 VISTA 工程内完成，生产预览运行于本机 Chrome 157.0.8103.79、Apple M4 Metal、1440×900、DPR 1。驾驶眼点、独立座舱渲染目标、场景轨迹、质量策略及 180 秒主时钟沿用现有系统。

## 实际画面

[四种投影同帧对照](verification/round5b/projection-comparison.jpg) · [实际桥梁与车辆裁切细节](verification/round5b/geometry-detail.jpg)

|图像|进入方式|
|---|---|
|[NORMAL](verification/round5b/projection-normal.png) · [CURRENT](verification/round5b/projection-current.png) · [PANNINI](verification/round5b/projection-pannini.png) · [STRUCTURE-AWARE](verification/round5b/projection-structure.png)|Lab 选择横向来车，停在 2.4 s。打开控制台内 Projection Research，依次选择算法。在三张展开图中，额外侧向角、眼点和目标位置完全相同。|
|[光学实验](verification/round5b/optical-lab.png) · [眼点越界](verification/round5b/optical-lost.png)|OPTICAL LAB。调 VID、水平/垂直眼点、观察方位、传播与延长线。全光路远景用于同时查看硬件及前方虚像。|
|[驾驶图像](verification/round5b/story-image.png) · [仪表台剖开](verification/round5b/story-cutaway.png) · [镜片与眼盒](verification/round5b/story-mirrors.png) · [虚像](verification/round5b/story-virtual.png) · [回到驾驶](verification/round5b/story-return.png)|第 04 章，105–135 s。[完整章节 Chrome 录屏](verification/round5b/optical-sequence.webm)，WebM/VP9，含载入及收尾共 32.12 s。|
|[数字视野](verification/round5b/story-digital.png) · [参考角域](verification/round5b/story-fov.png) · [眼点越界](verification/round5b/story-eyebox.png)|第 05 章，显示范围、接收光线数和导航图像会随眼点改变。|
|[驾驶提示](verification/round5b/story-warning.png) · [车内中控](verification/round5b/story-console.png) · [片尾座舱](verification/round5b/story-finale.png)|第 06 章。中控图层位于三维仪表台的屏幕材质上。车辆标点、来源、方向、风险和观测年龄读取当前帧数据。|

完整生产版从 0 自动播放到 180 s，抵达重播入口。同步录屏时采集 9237 帧，平均 51.3 FPS，P95 25.0 ms，WebGL 上下文丢失 0 次，控制台错误 0 条。[三分钟实际播放录屏](verification/round5b/VISTA-R5B-180s.webm) · [全程记录](verification/round5b/film-run.json)

## 同条件实测

|映射|新增视角|梁缘 RMS / 最大值 px|车型包络宽高比偏差|GPU 标记误差 px|平均 FPS / P95 ms|
|---|---:|---:|---:|---:|---:|
|标准|0°|0 / 0|视场外|0.167|60.0 / 18.3|
|Current|20.18°|23.10 / 49.55|+14.80%|0.140|59.7 / 18.3|
|Pannini|20.18°|15.34 / 26.90|−45.64%|0.045|58.3 / 19.7|
|Structure-aware|20.18°|<0.01 / <0.01|−1.37%|0.158|59.3 / 19.0|

几何指标使用真实场景坐标。车型参考为同眼点、朝向目标的局部透视，代表该视线附近的车形。固定前视的标准透视将此车投到屏幕左边界以外，故表中不列驾驶画面的可见形状。所有模式的中央 25 个采样点最大位移均小于 0.01 px。正规化坐标图集中的每个单元在左右方向和多个展开强度下均通过有序性检查。

60 Hz 动态采样中，结构保护模式的梁缘最大相邻位移为 0.688 px，最大二阶差分为 0.011 px。相同运动的 Current 分别为 0.582 px 和 0.053 px，Pannini 为 0.752 px 和 0.013 px。指标包含车辆与摄像机实际运动。数值是给定路口与时间区间的样本。[原始数值](verification/round5b/geometry.json) · [算法与参数](projection-research.md)

像素检查独立渲染一颗世界空间标记球，再从 Chrome 合成截图提取洋红色像素质心，与 HUD 锚点比较。计量时撤下座舱以避免 A 柱裁去标记。标准视野使用研究策略、零展开、7.2 s，使目标进入测量画面。三种翼部映射均使用 2.4 s。日常驾驶及交付截图使用正常遮挡与风险策略。[像素质心与样本数](verification/round5b/registration.json)

性能来自关闭抽屉的生产版路口实时播放，每工况预热后取约 3.6 s 的 R3F 帧间隔，每组 210–216 帧。此数值描述浏览器提交渲染帧的节奏，首次模型载入、录屏及热稳态另计。[逐次性能与 GPU](verification/round5b/performance.json)

## 光学与时序

默认中心像点收到了 9/9 条有效光线，反向最小二乘拟合得到 10.00 m。将眼点移至眼盒横向边界 65 mm 时部分瞳孔采样被裁切，移至 85 mm 后为 0/9。3、7.5、10、14 m 等效设计设置、平面主镜基线、镜缘外射线、反射角、前后传播方向和孔径均有自动化测试。默认 13°×5° 对应的虚像面约 2.28×0.87 m。[模型、来源与限制](optical-model.md)

`npm run typecheck`、`npm run build` 通过。`npm test` 23/23 通过，覆盖投影、真实反射、局部曲面、眼盒与可逆时间线。`npm run test:e2e` 11/11 通过，覆盖三场景、座舱像素一致性、左右配准、消息过期、Story 往返、VID 变化、眼盒裁切及章节收尾。生产主 JS 约 1.35 MB，gzip 约 399 kB，构建仍提示主块较大。

## 复测

```sh
npm run dev
# 另一个终端
node --import tsx scripts/r5b-metrics.ts
node scripts/r5b-capture.mjs --registration
npm run test:e2e
```

运行构建并启动本机 Vite preview 后，使用以下命令保存无调试标记的生产画面。性能和录屏应分别执行。

```sh
VISTA_URL=http://127.0.0.1:4173 node scripts/r5b-capture.mjs
VISTA_URL=http://127.0.0.1:4173 node scripts/r5b-capture.mjs --performance
VISTA_URL=http://127.0.0.1:4173 node scripts/r5b-capture.mjs --video
VISTA_URL=http://127.0.0.1:4173 node scripts/r5b-capture.mjs --film
python3 scripts/r5b-comparison.py
```

最后一条使用 Pillow，从原始网页截图排列对照与裁切细节。

## R6 精修与正式演示验收

- [ ] 在课程教室投影机的实际比例、缩放和观看距离下，检查细线、深色字幕、中控文字及导航符号。
- [ ] 对不同构图和靠近翼部边缘的车辆复测形状误差。检测桥梁之外的立面折线是否需要独立约束。
- [ ] 检查组合光束在不同画幅下与镜片标签的间距、弱光下的可读性，以及近景向十米虚像远景的镜头速度。
- [ ] 核对正式演讲的暂停点、技术讲解措辞及实验返回路径。完成断网冷启动和目标机长时间播放回归，评估主块拆分收益。

工业级自由曲面优化、玻璃双表面重影、光度标定和实车驾驶验证均属于独立研究。当前演示记录的是几何仿真与浏览器测试。

## 文件交接

|职责|文件|
|---|---|
|映射、线约束、目标形状与定量比较|src/domain/researchProjection.ts、src/rendering/ProjectionPass.tsx、SpatialHUD.tsx|
|求交、反射、虚像重建及眼盒|src/domain/opticalRayTracer.ts、src/rendering/OpticalAssembly.tsx|
|座舱剖面与实体中控|src/rendering/cockpit.ts、StreetWorld.tsx、consoleDisplay.ts、Drive.tsx|
|可逆叙事、控制台、排版|src/scenes/story.ts、src/components/Story.tsx、ResearchControls.tsx、src/app/main.tsx、src/styles/main.css|
|实验、录屏、回归|tests/research.test.ts、tests/round5b.spec.ts、scripts/r5b-metrics.ts、r5b-capture.mjs、r5b-comparison.py、package.json|
|交接与来源|README.md、docs/projection-research.md、optical-model.md、ARCHITECTURE.md、DECISIONS.md、PROGRESS.md、ACCEPTANCE.md、assets-license.md、roadmap.md、round5b-verification.md|
