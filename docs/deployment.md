# VISTA Preview v1 发布

源码仓库 https://github.com/Langlanguyu/vista-driving-experience

公开入口 https://langlanguyu.github.io/vista-driving-experience/

本次仅修正部署路径、添加 GitHub Pages 工作流与离线打包。使用相对 Vite base 和 BASE_URL 资源函数，适配仓库子目录以及本地 HTTP 根目录。关键 GLB、WebP、HDR、代码与署名均包含在构建中。外部论文链接供主动点击，不参与场景运行。

本地版本保存在 release/vista-preview-v1/，压缩包为 release/vista-preview-v1.zip。双击 Start VISTA.command 会运行附带的 macOS 11+ Intel / Apple Silicon 通用程序，在 127.0.0.1 自动选择可用端口，并打开默认浏览器。保持终端窗口运行，Control-C 结束。使用现代 WebGL 2 浏览器。首次运行可能需要在 macOS 隐私与安全性中允许本次打开。

离线服务源码位于 scripts/offline-server.c，脚本 npm run package:offline 重新构建并打包。用户运行离线成品不需要 Node.js、npm、Python 或互联网。打包时开发机使用系统 clang 生成通用二进制。ZIP 包含 SHA256SUMS.txt、模型署名与依赖许可证。

Git 忽略 node_modules、dist、release、环境配置、密钥、缓存、历史录屏截图和参考 DOCX 原件。参考材料与阶段验收证据保留在当前工作区。公开分发的运行模型使用上游记录的 CC BY 4.0 或 CC0，并携带 public/assets/credits.txt 署名与修改说明。

## 更新

修改源码后运行 npm run build 与相关测试，正常提交并推送 main，即可触发 GitHub Actions。部署流程见 .github/workflows/deploy.yml。使用已登录 gh 的机器可运行 gh auth setup-git 设置 HTTPS 凭证。

## 验收方法

scripts/deploy-smoke.mjs 用全新 Chrome 会话、禁用 service worker，并拦截全部非站点源请求。分别检查开发版、生产版、离线 HTTP 服务和在线 Pages。覆盖四个 GLB 加载、X-Ray 开关、高中低质量、左右自适应投影、过期消息、光学眼盒、七章定位和返回实验室。实际结果与截图存放于 release/verification/。此方法模拟外网完全不可达，未切换机器网络设置。
