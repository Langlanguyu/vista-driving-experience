# 滨河大道场景资产

模型、纹理、环境光源及许可说明均随项目本地提供。页面的「技术说明」可打开随生产构建分发的 [署名清单](../public/assets/credits.txt)。全景图仅用于天空、表面反射或橱窗内部装饰。道路、车、人行道、建筑和桥梁具有世界坐标和深度。

|本地资产|作者、原件与许可证|本项目的处理|
|---|---|---|
|cargo.glb|**taeemtasbi**，分发项目亦记为 MD. NAHID HASAN。原始 GLB 的 asset.extras 含作者、原作链接和 CC BY 4.0。[Sketchfab 原作](https://sketchfab.com/3d-models/tata-bangladashi-truck-1d46922d2a0b4aa688349dd005fe5ee1) · [公开分发副本](https://github.com/Ahnuf-Karim-Chowdhury/computerGraphics3js/blob/main/public/models/truck.glb) · [许可](https://creativecommons.org/licenses/by/4.0/)|保留车架、驾驶室、轮胎和货斗，精简网格、合并材质批次、贴图转 WebP、调整涂装。增加场景用尾标、反光条和接触阴影。以 2.65 × 3.65 × 7.40 m 仿真外包络配准。|
|coupe.glb|Car Concept，© 2024 Darmstadt Graphics Group GmbH，Eric Chadwick 制作模型与纹理，底模为 Unity Fan 的 CC0 概念车。Khronos 与 3D Commerce 标识依上游保留商标说明。[原件与许可](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)|简化、合批及重编码。目标车对齐 1.82 × 1.45 × 4.40 m 仿真包络。复用内饰构建驾驶舱，街边停放车辆使用调整过的漆面。|
|bay.glb|Poly Haven，[Modular Urban Apartments Facade](https://polyhaven.com/a/modular_urban_apartments_facade)，[CC0](https://polyhaven.com/license)|提取立面部件并简化，按约 3 m 模数实例化。|
|tree.glb、foliage.webp|Poly Haven，[Tree Small 02](https://polyhaven.com/a/tree_small_02)，CC0|原始约 206 万三角面。运行网格降至 18,560 面，补以从同株原模型离线渲染的透明树冠贴图。|
|road-*.webp、brick.webp、concrete.webp|Poly Haven，[Asphalt 04](https://polyhaven.com/a/asphalt_04)、[Brick Wall 001](https://polyhaven.com/a/brick_wall_001)、[Concrete Floor 02](https://polyhaven.com/a/concrete_floor_02)，CC0|本地 1K 级 WebP，路面使用颜色、粗糙度和 OpenGL 法线图，砖材与混凝土用于建筑与街面。|
|afternoon.hdr、reflection.hdr|Poly Haven，[Industrial Sunset 02 PureSky](https://polyhaven.com/a/industrial_sunset_02_puresky)、[Modern Buildings 2](https://polyhaven.com/a/modern_buildings_2)，CC0|分别用于天空及 PBR 城市反射。各 1K HDR。|
|shop-0/1/2.webp|Poly Haven，[Decor Shop](https://polyhaven.com/a/decor_shop)，CC0|从室内全景裁切三段低分辨率橱窗陈设。|
|facade-*.webp|ambientCG，[Facade018A](https://ambientcg.com/a/Facade018A)，[CC0](https://docs.ambientcg.com/license/)|从官方 1K-JPG 包提取颜色、法线、粗糙度，转 WebP，用于街角建筑侧面。|

车头统一朝 Three.js 的 −Z。先将模型旋转 180°，按实际顶点求包围盒，以地面中心作为轨迹原点，再映射至场景包络。尺寸是课程场景的注册尺寸。现有模型的荷载状态和精确车型尺寸未经实车测量。

道路、路肩和人行道、桥桁架、建筑主体、灯具、站牌、商铺字样及界面由项目生成。Codrops 仅用于交互参考。研究中比较过的简化厢式车未随项目分发。原始百兆级树木工作文件未纳入运行资产。

## R3 更新

`noon.hdr` 使用 1K Kloofendal 48d Partly Cloudy (Pure Sky)，作为可见日间天空。反射仍使用城市 HDR。来源和许可见 [Poly Haven 资产](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky) 与 [CC0 声明](https://polyhaven.com/license)。

本轮驾驶员视角的方向盘、仪表台、A 柱、玻璃曲面、仪表图形，以及加装在署名货车底盘上的封闭货厢、门闩、涂装由项目生成。保留上表原车与目标车署名。

## R4 新增内容

继续使用原货车、Car Concept、街区立面、道路材质与天空。横向来车与 X-Ray 共用已有车型几何。交叉路口、转角建筑布置、降雨线段、局部着色、投影、章节镜头由项目生成。外部投影和动效项目用于方法调研。本轮交付未新增外部模型或纹理。

## R4.5 注册尺寸

保留 Tata 底盘、原货厢与 Car Concept 的既有资产和许可。Three 世界空间实测 Car Concept 实例长 4.400 m、宽 2.567 m、高 1.160 m，车长为仿真注册基准。货车含货厢与尾部装饰后的顶点包络为长 7.516 m、宽 2.620 m、高 3.635 m。原 GLB 节点及父级变换见[模型诊断](verification/round45/models.json)。

## R5B

光学组件、镜面采样网格、虚像符号、光线、眼盒和中控地图均由本仓库代码生成。文献用于确定设计案例参数和技术方法，页面未嵌入论文插图或外部模拟器素材。验收 JPG 来自本机 Chrome PNG 的分区裁切及拼排，WebM 为同一程序的实际播放录屏。来源记录见 [光学模型](optical-model.md) 和 [投影研究](projection-research.md)。
