# R3 驾驶座舱与空间显影验收

## 课堂演示

打开页面后停在 2.4 s。关闭 HUD 查看货车实景，再打开 HUD 观察货车尾部方向出现的半透明车形和距离。点击「查看感知原理」会冻结车辆位置，略收窄镜头，货厢逐渐透明。标线分别落在前景车体、红色目标车和路侧位置估计上。退出可回到同一锚点。播放到第 6–10 秒，目标车向左驶出遮挡；可拖回同一时刻重演。

| 实际 Chrome 画面 | 观察点 |
| --- | --- |
| [01 · HUD OFF](verification/round3/01-hud-off.png) | 2.4 s，前景货车完全挡住红车，方向盘后的实体仪表保留。 |
| [02 · HUD ON](verification/round3/02-hud-on.png) | 同一位置和镜头。车形、接地环及距离取自延时采样并外推的路侧轨迹。 |
| [03 · 技术揭示](verification/round3/03-technical-reveal.png) | 车体原位半透明，能看到红车以及路侧估计与真实位置的关系。 |
| [04 · 降级](verification/round3/04-degraded.png) | 位置不确定度超过阈值，精准图形消失，留下前方车辆提示。 |
| [补充 · 估计区域](verification/round3/04b-estimated.png) | 中档质量显示带横向不确定度的虚线区域。 |
| [05 · 沉浸驾驶](verification/round3/05-immersive.png) | 5.1 s，道路与路边车位置已有变化，面板收起。 |

[实际网页交互录屏，9.84 秒，1440×900，WebM VP9](verification/round3/interaction.webm) · [状态总览](verification/round3/overview.jpg)

## 镜头与日光

眼高 1.38 m，眼点向左偏 0.30 m。80° 镜头下前车较大，驾驶舱两侧和顶边被裁去较多。95° 能看到更多顶棚和立柱，前车显得更小。默认选 88°，能同时看清货厢后门、左侧车道和座舱边缘。垂直视角随画布变化，1440×900 时为 62.23°。教学镜头平滑收至水平 78°。[与 R2 基线对照](verification/round3/camera-study.jpg) · [80°](verification/round3/fov-80.png) · [88°](verification/round3/fov-88.png) · [95°](verification/round3/fov-95.png)

同一云天、光照、曝光与取景下，Neutral 的蓝色、砖色与道路黄线更浓；ACES 的白货厢、云层和玻璃反射之间过渡更柔和。本轮采用 ACES Filmic、曝光 1.12、sRGB 输出。街区仍可看出立面重复，部分远景树冠沿用离线裁片。[Neutral](verification/round3/tone-neutral.png) · [ACES](verification/round3/tone-aces.png)

品牌和场景文字按组入场，HUD 按锚点、轮廓、文字的顺序显现。复用场景时钟，教学转场单独使用可逆的 780 ms 进度，支持系统减少动态效果偏好。排版动效参考了 Codrops 的分段显现方式。[Codrops 示例](https://tympanus.net/codrops/2020/06/17/making-stagger-reveal-animations-for-text/)

## 深度与估计

在开发页面仅移除目标车网格，保留场景时间、光照、观测和决策。在 2.4 s，HUD OFF 全帧与移除网格的对照逐像素相同。教学状态下，同样比较中心区域 x=[620,830)、y=[340,560)，有 2,326 个像素的最大 RGB 通道差超过 12（8 位通道），实际红车出现在货车后方。[正常对照](verification/round3/depth-reference.png) · [揭示对照](verification/round3/reveal-reference.png)

驾驶视图使用网格深度测试。感知端使用估计车辆后截面的 3×3 样点对货车包络做线段求交；遮挡率是被截断的样点比例。该离散值供显示决策使用。位置质量由横向 σ 和信息年龄决定，TTC 需满足接近与轨迹冲突条件。此场景使用单一模拟 RSU，固定眼点，精度和风险均未进行实车标定。

## 复测

- 类型检查、生产构建通过。主 JS 约 1.29 MB，gzip 约 374 kB，Vite 保留包体积提醒。
- 8 项单元测试通过，包含视角换算、遮挡比例从完全到部分再到退出、轨迹间距、失效恢复和 TTC 边界。
- 3 项 Playwright 测试通过，覆盖质量循环、拖动和锚点往返、播放/暂停/重播、全屏、视角切换、教学揭示冻结与恢复。
- Apple M4 / 16 GB，Chrome 157.0.8103.79，ANGLE Metal，生产预览 1440×900、DPR 1、控制台展开。两轮分别取得 600 / 599 个渲染时刻，平均均为 60.0 FPS，帧间隔 P95 为 16.9 / 17.3 ms。采样窗口为回放第 1 至 11 秒，未覆盖首载、录屏、Retina 高 DPR 或课堂投影设备。[原始测量](verification/round3/performance.json)

基础验证运行 npm run typecheck、npm run build、npm test、npm run test:e2e。开发服务启动后运行 node scripts/r3-capture.mjs 可复采截图和录屏，需本机 Chrome 与 Playwright FFmpeg。生产测量先启动 npm exec vite preview，再运行 node scripts/benchmark.mjs。两份脚本可用 VISTA_URL 指定本地服务。

R4 从现有单车样例增加可回放的侧向冲突目标。优先验证目标跨越 HUD 水平视场边界时，方向提示、消息过期和恢复能否在同一帧保持一致。
