# AICDKS 站点品牌资源

本文档说明 `web/public/branding/` 下随前端一起发布的 AICDKS 品牌静态资源，
以及上线时在管理台填写的运行时站点选项。仅涉及可配置的站点品牌部分；
new-api / QuantumNous 的项目署名、版权与归属信息一律保持不变（见 AGENTS.md
Project Governance）。

## 资源清单（构建后以 `/branding/...` 提供）

| 文件 | 用途 |
|---|---|
| `home.html` | 品牌化首页（自包含、响应式、跟随站点深浅色主题），供 `HomePageContent` 引用 |
| `orbit-mark.svg` | 正式 logo 图标（Orbit Hex，老板已定稿；Logo 选项 / favicon） |
| `orbit-logo-{light,dark}.svg` | 深浅色横版 lockup（home.html 引用） |
| `favicon.svg` | favicon |
| `apple-touch-icon.png` | 180×180 iOS 图标（深底） |

品牌源文件、PNG 渲染稿与落选方案归档在 `wookat/llm-relay` 仓库 `site/brand/`。

## 上线时的运行时选项（管理台 → 系统设置 → 通用）

| 选项 | 值 |
|---|---|
| 系统名称（SystemName） | `AICDKS API` |
| Logo | `/branding/orbit-mark.svg`（favicon 与页面标题随之自动应用） |
| 首页内容（HomePageContent） | `/branding/home.html`（同源 URL，前端以 iframe 呈现并自动同步深浅色主题） |
| 页脚（Footer） | `<a href="https://api.aicdks.com">AICDKS API</a> · <a href="https://aicdks.com">AI CDK 商店</a>` |

以上均为 new-api 原生支持的站点自定义选项，不涉及代码行为变化。

## home.html 说明

- 自包含单文件（内联 CSS，无构建步骤），移动优先响应式。
- 监听宿主页 `postMessage` 的 `themeMode`（new-api 首页 iframe 会在加载与主题切换时发送），自动切换深浅色。
- 所有跳转链接带 `target="_top"`，配合 new-api iframe sandbox 的
  `allow-top-navigation-by-user-activation` 在用户点击时跳出 iframe。
