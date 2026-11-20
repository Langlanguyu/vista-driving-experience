# R6.1 实测

R6.1 基于 e4c67a5，在独立分支 r6.1-visual-audio 上开发。GitHub Pages 的稳定 Preview 保留于根入口，电影入口位于 /vista-driving-experience/r6/。

## 体感与分镜

- 首次加载后零秒待机。向下滚轮、上滑超过 22 CSS 像素、向下键或可访问的启动按钮触发一次。重复滚动不 seek，Replay 回到待机，精确时间定位保留在「···」。声音授权与视觉进度独立。
- 从字形实际覆盖率采样，按边缘到内部的厚度和词组分批解体。SEE 在开场取得更强局部光照，脱离字形的实例沿收束弧线进入路面消失点。普通画质在 ?quality=low 下减少字形采样与离屏多重采样。
- 已在 Chrome 复现用户截图对应的约 117 秒硬件揭示。原剖面相机启动时车身淡出尚未完成，导致 A 柱和仪表台材质转为半透明并关闭深度写入后仍占据画面。方向箭头也早于光束到达自身的位置。改为先完成车身与街景隔离，再绕光机移动相机；方向箭头等到追迹线段到达才出现。相机恢复正视后仪表台再回归。镜子、PGU、玻璃和眼点沿用相同的米制几何。
- 原 R6 时间函数中的外移权重恒为零。R6.1 接回已有侧后方机位与本车外壳通道，167 秒起从驾驶员眼点缓缓退出，最终保持两辆车、铁路桥与街区纵深。车辆轨迹和路口布局继承现有场景。
- 天空、照明与漆面使用同一实拍晴空，阴影方向来自 HDR 峰值方向。叠加地平线薄雾以衔接远楼与背景，增强低角度沥青纹理和车辆近地阴影。高档采用既有 2× MSAA，低档关闭离屏 MSAA，降低像素比上限。未新增全屏环境遮蔽或景深开销。
- 新音乐及候选试听情况见 [声音记录](audio-credits.md)。成片音轨取自实际运行页面的 Web Audio 主增益输出，用同次 Chrome 视频中的首个启动帧对齐；成片为 180 秒，H.264、AAC 立体声。

## 实测和交付位置

- 类型检查、生产构建、23 个单元测试、13 个 Chrome 回归通过。覆盖滚轮、惯性、键盘、Chrome 原生触控模拟、显式跳章、重播回零、声音解锁、暂停恢复、Lab 切换、光学眼盒、左右投影、感知衰减及低画质。实体手机和外部扬声器未作验收。
- Apple M4 / 16 GB、Chrome 157、ANGLE Metal，1440 × 900 的开场、侧向展开、光学剖面分别为 57.8、60.0、60.0 次更新/秒；1920 × 1080 分别为 48.8、52.9、56.2。每段 6.5 秒，统计 rAF 观察到的影片时间更新。采样环境与真实设备负载会影响结果。
- docs/verification/r61/comparison.jpg 包含 27 秒货车、60 秒交叉口、180 秒双车及 117 秒光学修复。前三组均为 1920 × 1080，同场景、同时间、同眼点和同投影强度。片尾两侧均采用已接回的同一外部机位，以便单独判断材质和光照变化。原 R6 驾驶位末帧仍在 docs/verification/r6/shot-180.jpg。
- docs/verification/r61/storyboard.jpg 包含完整字形、SEE 解构、道路融合、连续光学分镜与结尾。单帧位于 after/。同目录 VISTA-R6.1.mp4 为完整三分钟，First-scroll.mp4 与 Optical-reveal.mp4 为开场和光学实录。
- scripts/r61-stills.mjs、scripts/r61-film.mjs、scripts/r61-export.py 可复现截图与录制。scripts/r6-perf.mjs --r61 测量三个实际片段。macOS 离线包通过 npm run package:offline 生成在 release/vista-r61.zip。

## 参考与离线复验

Chrome 实际访问了现网 Preview、RI.Studio 和 Codrops。RI.Studio 以立体房间和大字共享一个构图，滚动后标题进入房间前景。Codrops 在线 Demo 出现访问验证；从作者仓库在临时目录运行原版示例，固定其 MSDF 依赖版本后点击 Start。实际看到金色完整字形先停留，字面局部开空，随后红色片状与白色小点离开原轮廓。本项目将阶段组织用于 SEE 的边缘解体与道路同向运动。参考 Demo、字体与音频均未纳入发行包。[作者示例](https://github.com/WallabyMonochrome/WebGPU-clair-obscur-gommage-codrops) · [RI.Studio](https://www.rikoutaku.work/)

离线验收从 ZIP 解压、运行随包附带的 macOS 本地服务，在全新 Chrome 会话拦截所有非本机请求。新音轨、四份 GLB、左右投影、三种感知场景和光学实验通过。验收原始数据位于 release/verification/r61-offline.json。
