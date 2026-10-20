# Advanced Composites Protocol (ACP)

ACP 协议中文官网，使用原生 HTML、CSS 和 JavaScript，无后端或环境变量依赖。

## 本地启动

安装 Node.js LTS 后，在项目根目录执行：

```sh
npm ci
npm run dev
```

打开 http://127.0.0.1:3000。使用 `Ctrl+C` 停止服务。

## 部署到 Vercel

1. 在 Vercel 中选择 **Add New → Project**，导入 `Web3gogogogogo/acp`。
2. Root Directory 保持仓库根目录，Framework Preset 选择 **Other**。
3. 点击 **Deploy**。

根目录的 `vercel.json` 已指定输出目录为 `dist`，并关闭构建步骤。页面已经是可直接发布的静态文件，不需要编译，也不需要配置环境变量。后续推送到 `main` 会触发已关联 Vercel 项目的自动部署。

配置参考：[Vercel 项目配置](https://vercel.com/docs/project-configuration)。

## 文件说明

- `dist/index.html`：页面源码，包含样式和交互脚本；修改后刷新本地页面即可。
- `dist/assets/acp-mark.svg`、`acp-mark-original.png`：品牌标志。
- `dist/assets/ACP_Whitepaper_V1.1.pdf`：白皮书。
- `vercel.json`：Vercel 静态部署配置。
- `package.json`、`package-lock.json`：本地预览命令及锁定的工具依赖。

`dist` 是本项目直接维护的站点源码，需要提交到 Git。原有 `.openai` 托管信息仅保留在本地，不参与 GitHub 或 Vercel 部署。
