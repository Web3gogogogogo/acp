# Advanced Composites Protocol (ACP)

ACP 静态官网及 V1.1 网页版白皮书，使用原生 HTML、CSS、JavaScript；没有后端、在线翻译服务、环境变量或构建步骤。

## 本地启动

安装 Node.js LTS 后，在项目根目录执行：

```sh
npm ci
npm run dev
```

Windows PowerShell 如果拦截 `npm.ps1`，使用 `npm.cmd ci` 和 `npm.cmd run dev`。

- 首页：http://127.0.0.1:3000/
- 白皮书：http://127.0.0.1:3000/whitepaper
- 章节直达示例：http://127.0.0.1:3000/whitepaper#chapter-7-2

按 `Ctrl+C` 停止前台服务。请通过 HTTP 预览，不要直接打开 `index.html`；语言资源通过同源请求按需读取。

## 语言与阅读行为

提供繁體中文、English、한국어、日本語、Tiếng Việt、اردو六种语言，不提供简体中文选项。每次打开或刷新均为繁体，不读取浏览器语言、不使用 Cookie 或本地存储记住选择。

首页、白皮书和章节链接使用 History API 切换，保留当前运行中的语言；前进、后退同样保留。切换白皮书语言会定位回当前章节。乌尔都语使用 RTL，拉丁缩写和数字用 `bdi` 隔离。

语言资源完整加载并校验后才更新页面。加载失败时保留当前内容，显示当前语言的错误提示及重试按钮。白皮书含 13 章、53 个章节锚点、3 张表、2 张原图及各语言完整图示说明；桌面侧边目录、手机折叠目录、阅读进度及返回顶部共用一套内容。

原始 PDF 保留为 **简体中文、V1.1、18 页**。网页翻译不会修改原文件，本仓库不生成六份翻译 PDF。

## 部署到 Vercel

仓库已有 `vercel.json`：Framework 为 Other（`null`），Root Directory 为仓库根目录，输出目录为 `dist`，不运行构建。`/whitepaper` 和 `/whitepaper/` 精确重写到 `index.html`，章节使用 URL hash；静态资源与不存在的 URL 不被全局回退覆盖。

本地 `serve.json` 使用相同的两条路由。已关联的 Vercel 项目可以从 `main` 获取更新；本次代码修改无需创建新项目。

配置参考：[Vercel 项目配置](https://vercel.com/docs/project-configuration)。

## 内容维护与检查

```sh
npm run check
```

检查六语言键一致性、渲染覆盖、章节与表格结构、关键数字、原始 PDF 校验值、繁体初始内容及本地/Vercel 路由一致性。浏览器交互验证记录见 [docs/verification.md](docs/verification.md)。

- `dist/index.html`：首页、原有品牌样式及繁体首屏。
- `dist/assets/app.js`：语言加载、路由、动态 RWA 面板与白皮书阅读器。
- `dist/assets/i18n-ui.js`、`multilingual.css`：共用界面翻译和布局。
- `dist/locales/home.*.json`：每种语言的 193 个首页固定文案键。
- `dist/locales/whitepaper.*.json`：每种语言的 233 个白皮书固定文案键。
- `dist/assets/whitepaper-structure.json`：章节顺序、稳定锚点、表格及图示映射。
- `content/`：源文对照与内容说明，不对外发布。

`dist` 是直接维护的站点源码，必须提交到 Git。修改首页繁体 JSON 时，同时更新 `index.html` 中对应的静态文字与 `initial-home` JSON；检查命令会验证初始 JSON 同步。修改白皮书时，先对照原文，再同步六套资源，保持键和锚点稳定。

`.local`、`.openai`、`.vercel`、`node_modules` 和环境文件不参与提交或部署。
