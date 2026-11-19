# Round 2 检查记录

**场景。** 本轮以滨河大道替换 R1 公路。12 秒时钟对应自车前进 144 m。街面和遮挡物产生真实视差。cargo 与 coupe 模型从本地 GLB 加载，相机位于 1.48 m 眼高。手动空间观察临时展示道路几何，回到驾驶员视角时恢复同一时刻的估计锚点。关闭 HUD 会移除世界标记、方向提示及车速叠层。

**画面对比。** [1440×900 前后对比](verification/round2/comparison.jpg) · [R1 全屏](verification/round2/before-full.png) · [R2 全屏](verification/round2/after-full.png)。R2 桌面画布为 1440×705，占视口 78.3%。上方身份栏、下方控制栏与三维画面分开。

**遮挡。** [驾驶员 HUD OFF 与斜上方几何观察](verification/round2/geometry.jpg)。同一时刻，前方货车在驾驶员眼点遮住红色目标车，斜上方能看到红车位于货车行驶方向的更前方。目标颜色只属于真实车体，透视图形取自带时延的估计。货斗材质保持不透明。

**回放。** [2.4、6、10 秒关键帧](verification/round2/sequence.jpg)。这些截图来自实际 Chrome WebGL 程序。程序化场景轨迹与信息质量状态沿用 R1。三档切换、HUD 开关、暂停、拖动、结束后重播、复位、参数中断/恢复和观察视角往返均有 Playwright 检查。

**验证命令。** npm run typecheck、npm run build、npm test、npm run test:e2e。本轮 6 项算法测试和 2 项浏览器测试通过。质量循环回到高档时，测试比较屏幕锚点与初始锚点。前端构建仍有单一 JS 包体积提醒，约 1.28 MB 未 gzip，约 369 kB gzip。

**性能。** Apple M4，16 GB，Chrome 157，通过 Playwright 启动，使用 ANGLE Metal。生产预览，视口 1440×900、DPR 1、控制台展开。以 R3F 渲染帧时间戳分别采样两遍第 1–11 秒。两次平均均为 60.0 FPS，帧间隔 p95 均为 17.5 ms。初载下载和 shader 首编译不在测量窗口内。此结果适用于该条件，Retina 更高像素密度、录屏和课堂投影设备需另测。[原始数据](verification/round2/performance.json)

复测时先运行 npm run build 和 npm exec vite preview，再运行 node scripts/benchmark.mjs。VISTA_URL 可指向其他本地预览地址。场景限制 DPR 最高 1.25，静止时按需绘制，重复构件实例化，单一 2048 阴影图。城市材质、几何和阴影资源随组件释放，模型与纹理由加载器共享缓存。资产目录约 20 MiB，首次加载受本机磁盘和浏览器解码影响。

**R3 接口。** 渲染采用真实网格深度，R1 的显示策略仍使用「眼点→估计中心」与货车外包络相交。两者对部分遮挡的判断存在差异。下一轮在三个固定时刻对目标顶部、中心和接地点分别采样，保存遮挡比例与来源依据，再检查角点进入/退出遮挡时的呈现稳定性。
