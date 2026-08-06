# AICDKS 站点品牌资源

本文档说明 `web/public/branding/` 下随前端一起发布的 AICDKS 品牌静态资源，
以及上线时在管理台填写的运行时站点选项。使用 new-api 自带的默认首页/落地页，
品牌化仅涉及 logo、站点名称、favicon/apple-touch-icon 与页脚等可配置项；
new-api / QuantumNous 的项目署名、版权与归属信息一律保持不变（见 AGENTS.md
Project Governance）。

## 资源清单（构建后以 `/branding/...` 提供）

| 文件 | 用途 |
|---|---|
| `orbit-mark.svg` | 正式 logo 图标（Orbit Hex，老板已定稿；Logo 选项 / favicon） |
| `orbit-logo-{light,dark}.svg` | 深浅色横版 lockup（宣传物料用） |
| `favicon.svg` | favicon |
| `apple-touch-icon.png` | 180×180 iOS 图标（深底） |

品牌源文件、PNG 渲染稿与落选方案归档在 `wookat/llm-relay` 仓库 `site/brand/`。

## 上线时的运行时选项（管理台 → 系统设置 → 通用）

| 选项 | 值 |
|---|---|
| 系统名称（SystemName） | `AICDKS API` |
| Logo | `/branding/orbit-mark.svg`（favicon 与页面标题随之自动应用） |
| 首页内容（HomePageContent） | 留空（使用 new-api 默认首页） |
| 页脚（Footer） | `<a href="https://api.aicdks.com">AICDKS API</a> · <a href="https://aicdks.com">AI CDK 商店</a>` |
