# VISTA 架构基线

状态：六轮目标架构。R1 实际入口为 src/app/main.tsx，纯函数时间轴、观测与决策在 src/scenes/corridor.ts，坐标及遮挡在 src/domain/geometry.ts，Three.js 与 SVG 在 src/rendering。R1 使用 React 状态管理单场景。技术栈选择为 React + TypeScript + Vite、SVG HUD、轻量状态容器；采用可控 3D 世界，Three.js 负责道路及几何深度。首轮不引入 CARLA 服务。动画优先仿真时钟，GSAP 仅在独立界面动效确有需要时引入，不能驱动目标真实轨迹。

## 数据流与模块边界

```text
JSON Scenario → SceneTimeline → GroundTruth ──────────────→ SceneRenderer
                      ↓             ↓
               PerceptionData ← 采样/网络/质量模型
                      ↓
               CoordinateTransform（时间对齐、世界→车身→眼点）
                      ↓
               遮挡判定 + RiskAssessment + ConfidencePolicy
                      ↓
                 DisplayPolicy → HUDRenderer
                      ↓
                 可解释的诊断面板

DemoController → 同一个场景时钟与参数命令
OpticsVisualizer ← DisplayPolicy + 眼点/HUD标定参数
```

GroundTruth 只供场景渲染、模拟观测生成和开发验证。风险/HUD 不能直接读取完美真值；否则延迟、丢包和失效控制只是视觉假象。仿真深度服务表示本车可用深度输入，若输入无效需显式降级，不默认为无限准确。

| 模块 | 输入与输出 | 职责 |
| --- | --- | --- |
| SceneTimeline | scenario + t → truth frame | 纯时间函数，目标运动与自车位姿，暂停/seek一致 |
| SceneRenderer | truth + camera + assets | 渲染道路、车辆、行人，提供一致的投影及深度接口；不决定风险 |
| PerceptionData | truth → 带capture/receive时间、source ID的观测 | 固定采样周期、确定性噪声/延迟、丢包，关联去重与跟踪；真值不外泄至HUD |
| CoordinateTransform | observations + ego/eye pose → aligned estimate | 外参、时间对齐、有限外推、投影有效性与误差传播 |
| RiskAssessment | aligned tracks + ego path → risk | 冲突可能性、纵向TTC/横穿冲突时间、未知/无冲突区别 |
| ConfidencePolicy | 观测质量、age、误差、眼点 → quality | 分离存在可信度和位置误差；确认/估计/降级/不可用，迟滞恢复 |
| DisplayPolicy | risk + quality + environment + FOV → display primitives | world/screen/none、包络、线型、方向、元素预算与解释码 |
| HUDRenderer | primitives | 仅渲染，可测试SVG，不重新计算业务判断 |
| DemoController | preset/transport/demo commands | 统一时钟、切换与重置，180 s脚本后续扩展 |
| OpticsVisualizer | 标定与策略状态 | PGU/镜/风挡/眼点/虚像光路示意；硬件与浏览器渲染边界 |

## 坐标 时间与数据契约

- 世界 W：局部 ENU，米；E 车身：x前/y左/z上；H 眼点视图：x右/y上/z前。映射必须显式，不能把 Three.js 默认轴当车身轴。
- 齐次变换 `T_AB` 把 B 坐标转到 A。记录外参方向与单位；眼点投影统一由一处函数提供，场景相机和HUD共用。
- 内部时间为场景起点后的秒；界面毫秒仅格式化。记录 captureAt、receivedAt、renderAt；用实际 age 外推；禁止用收到时间替代采样时间。
- 观测最小字段：sourceId、trackId、class、positionENU、velocityENU、captureAt、receivedAt、existenceConfidence、positionCovariance、provenance。接地点与目标尺寸分开。
- 估计输出：位置/速度、age、协方差、来源、关联ID、外推标记；真值对象不符合该接口，防止意外混用。
- 决策输出：riskLevel、conflictTime/TTC可空、existenceState、positionSigma、registrationValid、reasonCodes；质量不可用不输出“安全”。
- 显示输出：anchorMode、targetId、projectedGeometry或direction、uncertaintyEnvelope、strokeStyle、riskCode、statusLabel、priority、reasonCodes。
- 画面相机FOV与物理HUD FOV分开。目标在画面内也可能在HUD外；后方目标不得投影翻到前方。
- 时间 seek 从确定性事件历史重算融合，不沿用未来状态；场景切换重置追踪、随机种子与迟滞状态。

## 拟定目录

```text
src/app/                  React入口、控制与诊断
src/domain/               类型、单位、坐标、风险、质量、显示策略
src/simulation/           时钟、观测、跟踪、回放
src/rendering/            场景、HUD、光学
src/data/scenarios/       JSON轨迹与仿真参数
public/assets/            独立视觉资产及来源清单
tests/unit/               几何、时延、策略边界
tests/e2e/                Playwright交互和截图
docs/                     规格、证据、决策、进度和验收
```

以上是待实施结构，不创建空壳模块冒充交付。各轮扩展已有契约，不让场景切换、光学面板与HUD维护互不相干的状态副本。

## R2 渲染入口

Drive 组合 R3F Canvas 和独立 SVG 层。StreetWorld 从同一个 SceneState 更新车辆与相机，city 构造实例化街面，streetSigns 负责世界中的标识。Drei 管理本地 glTF 和 HDR 环境的加载。控制台持有 HUD 开关与观察相机模式，模拟时钟继续由 app/main.tsx 驱动。

## R3 渲染路径

`corridor.frame` 用 ENU 真值生成带采样、时延和误差的轨迹。显示策略对估计车辆后截面采九个点，累计眼点至样点被货车包络截断的比例。`Drive` 根据实际视口生成共同的 CameraPose，交给 `StreetWorld` 和 `SpatialHUD`。前者将真值应用到 glTF 实体及深度缓冲，后者投影策略允许的估计位置。

`cockpit.ts` 和 `cargoBody.ts` 负责座舱与改装货厢。教学控制器位于 `src/app/main.tsx`，进入时保存播放状态并暂停，单一 0–1 转场进度控制视角与车体显隐；退出至 0 才允许先前播放继续。教学标引同时读取真值和估计。

## R4 空间与显示

- `src/scenes/corridor.ts` 在统一 ENU 和仿真时间下生成三种轨迹、RSU 样本、风险与遮挡。路口交通双方独立运动。转角建筑和感知包络引用相同的路口尺寸。
- `src/domain/displayPolicy.ts` 将存在可信度、位置 σ、跟踪稳定性和观测年龄映射成五种状态。历史采样重建精确定位迟滞，因此 seek 和反向滚动可复现。
- `src/domain/adaptiveProjection.ts` 提供左右连续映射、解析逆变换与 `projectWorldToDisplay()`。驱动眼点、时钟和有符号扩展量传入 `ProjectionPass` 与 `SpatialHUD`。标注锚点和地面轮廓样点走同一投影。COMPARE 对同一帧采样两次，分别裁出标准和研究画面的中央水平带。
- `src/rendering/spatialXray.ts` 共享目标 GLB 的网格，按估计位置渲染。货车写入 stencil，虚像网格深度预通过保留自身遮挡，颜色通过使用法线和视角相关轮廓。教学揭示另行控制真实货车材质。
- `src/scenes/story.ts` 把归一化滚动进度转换为场景、仿真时刻、姿态、显影和投影。`Story.tsx` 使用原生可滚动区域，自动播放推进同一 scrollTop。进入叙事时实验时钟暂停，回到实验后由实验控制器接管。

## R4.5 运行边界

|入口|输入|输出和所有权|
|---|---|---|
|useSceneController|enterScene、resetScene、restoreDefaultView、setPerceptionState|管理 Lab 预设、显示与教学状态。中途离开 Story 恢复原实验，完成故事可显式交接到路口预设。|
|useTimelineController|播放、暂停、setTimelineProgress(0…1)|以秒为单位的唯一 Lab 时刻。Story 使用 storyFrame(progress) 派生帧，Lab 时钟在后台暂停。|
|CameraController|帧、driver / inspect / story 所有者|唯一写入活动 Three 相机位姿的组件。观察镜头按场景计算，投影合成使用自己的临时相机。|
|setProjectionMode / useProjectionTransition|模式、风险方向、研究强度或故事进度|同帧强度驱动离轴世界采样与 projectWorldToDisplay。|
|perceptionDisplayPolicy|已到达观测、年龄、能见度、风险、HUD 视场、解除依据、滞回状态|五态决策，包含可选锚点、风险、理由及位置误差。|
|ProjectionPass|街景 HDR 纹理、标准透视 RGBA 座舱、映射参数|重采样街景，按座舱 alpha 合成并统一映射颜色。空间 X-Ray 在世界 stencil/depth 内参与同一投影；SVG 锚点使用映射后的坐标。|

R5A 的故事时间表应返回场景与帧状态，沿用 CameraController 和现有渲染层。滚动与自动播放共享进度。切换所有权时保留 Live Lab 的时间、参数和视角。[R4.5 实机证据](round45-verification.md)

## R5A 影片控制权

Story 的入口为 `?story` 或 Lab 顶部切换按钮。`src/scenes/story.ts` 的章节表冻结 0、15、43、75、105、135、163、180 秒八个边界。`storyFrame(progress)` 为 DOM、活动相机、WorldLayer、CockpitLayer、HUD 与可见性策略提供同一帧。Story 停止时，渲染沿用 R3F 按需更新。

Story.tsx 将原生滚动或实际经过时间归一化。章节重看和时间滑块直接 seek。写入 scrollTop 后忽略对应像素取整的回执，以保留精确边界。用户滚轮或触摸接管后停止自动推进。Lab 时钟与暂停状态独立保存。完成后进入 Lab 可以选择当前预设，顶部返回恢复原实验。

平面字形开窗读取下方真实画面；横向车辆与叙事字形在同一世界深度缓冲内相交。技术段沿用现有货车材质、X-Ray 与 PerceptionDisplayPolicy。风挡研究的位移、材质与标签作用于同一个座舱网格，章节退出后归零。RealityComparison 在一次同眼点采样中以屏幕位置切换正常与展开的世界射线，座舱 UV 固定。CockpitFuture 从驾驶员眼点退出至实际车辆外景。

## R5B 投影与光学

researchProjection 根据眼点、已知钢梁端点和车辆观测生成共享的单调逆映射纹理。ProjectionPass 对扩大的离轴世界缓冲区采样，SpatialHUD 反解同一纹理，独立的驾驶舱通道保持正常透视。Story 与 Lab 共享这条管线。

opticalRayTracer 保存驾驶员局部系内的有限镜面及曲面函数，反向试射、正向核验、虚像回归与显示范围判定可脱离 WebGL 测试。OpticalAssembly 把相同交点和真实口径送入座舱场景。consoleDisplay 直接读取 SceneState，在实体屏幕上绘制路口与目标。第 04–06 章所有剖开、镜头与图像状态均为 storyFrame 的纯函数。[投影方法](projection-research.md) · [光学模型](optical-model.md)
