# R6 参考观察

在 Chrome 以 1440 × 900 打开 [RI.Studio](https://www.rikoutaku.work/)，等待预加载、移动指针、点击主画面，再连续滚动三个视口距离。观察来自六个连续浏览器截图。

| 操作或时刻 | 可见变化 | VISTA 的取舍 |
| --- | --- | --- |
| 首次加载 | 同心暗阶中的亮点与右下百分比形成两个阅读位置 | 首帧加载独立于影片时钟 |
| 预加载消退 | 暗场切到浅色留白，房间模型占据中部，标题贴近模型下缘 | 先完成字形建立，再显露道路 |
| 停留并移动指针 | 房间先出现墙体和窗影，随后出现桌椅和黄色结构；操作与自动动画同时发生，无法归因为鼠标驱动 | 光学硬件先建立，辅助几何随后进入 |
| 向下滚动 | 原房间解为分散的块面，下一句大字出现在原空间上方 | 开场碎片从真实字形采样，运动指向道路纵深 |
| 再滚动 | 大字移出上边界，细线图与右侧短文进入同一画面，碎片退居边缘 | 采用镜头内字幕、空间标签 |
| 进入作品段 | 双列实物画面接管构图，页头仍固定 | 结尾让路口重新成为主体 |

研究入口包括 Codrops 的 Gommage、Interactive Text Destruction、Animating Letters with Shaders、Cinematic 3D Scroll 与 Layered Zoom，以及 glyphdust、kinetype。实现采用本项目编写的 WebGL 实例顶点着色器、系统字形采样和现有统一时钟。未引入参考站的模型、字体文件、代码或音频，也不依赖其许可证进行再分发。

## 技术取舍

- Codrops 的 Gommage 将 MSDF 阈值与粒子发射同步；Interactive Text Destruction 使用 WebGPU/TSL；Animating Letters 使用 GLSL 字形动画。R6 在现有 WebGL 管线上一次采样字形覆盖率，以确定性进度控制实例的厚度、朝向、位置。低成本模式减少采样并在字形局部收缩。
- Cinematic 3D Scroll 以滚动位置驱动固定画布中的相机，Layered Zoom 以分层缩放建立深度。VISTA 已有真实眼点和城市，本轮让自动播放与滚动采样同一故事函数，保留真实视差。
- glyphdust 项目页面标示 MIT，适合 R3F 中按进度驱动的文字重组。kinetype 未作为发行依赖。第三方字体、示例媒体的分发权限均未用于本项目。

[字形消解](https://tympanus.net/codrops/2026/01/28/webgpu-gommage-effect-dissolving-msdf-text-into-dust-and-petals-with-three-js-tsl/) · [文字解构](https://tympanus.net/codrops/2025/07/22/interactive-text-destruction-with-three-js-webgpu-and-tsl/) · [GLSL 字符](https://tympanus.net/codrops/2025/03/24/animating-letters-with-shaders-interactive-text-effect-with-three-js-glsl/) · [滚动相机](https://tympanus.net/codrops/2025/11/19/how-to-build-cinematic-3d-scroll-experiences-with-gsap/) · [分层缩放](https://tympanus.net/codrops/2025/10/29/building-a-layered-zoom-scroll-effect-with-gsap-scrollsmoother-and-scrolltrigger/) · [glyphdust](https://github.com/linno-inc/glyphdust) · [kinetype](https://github.com/edge404-studio/kinetype)
