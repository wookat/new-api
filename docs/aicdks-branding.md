# AICDKS 站点品牌资源

本目录说明 `web/public/branding/` 下随前端一起发布的 AICDKS 品牌静态资源，
以及上线时需要在管理台填写的运行时站点选项。仅涉及可配置的站点品牌部分；
new-api / QuantumNous 的项目署名、版权与归属信息一律保持不变（见 AGENTS.md
Project Governance）。

## 资源清单（构建后以 `/branding/...` 提供）

| 文件 | 用途 |
|---|---|
| `aicdks-mark.svg` | 图标（Logo 选项 / favicon，深浅背景通用） |
| `aicdks-logo-light.svg` | 横版标识，浅色背景用 |
| `aicdks-logo-dark.svg` | 横版标识，深色背景用 |
| `aicdks-apple-touch-icon.png` | iOS 主屏图标（180×180） |

品牌源文件（三个候选方案、色板、预览图）在 `wookat/llm-relay` 仓库 `site/brand/`。

## 上线时的运行时选项（管理台 → 系统设置 → 通用）

| 选项 | 值 |
|---|---|
| 系统名称（SystemName） | `AICDKS API` |
| Logo | `/branding/aicdks-mark.svg`（favicon 与页面标题随之自动应用） |
| 页脚（Footer） | `<a href="https://api.aicdks.com">AICDKS API</a> · <a href="https://aicdks.com">AI CDK 商店</a>` |

以上均为 new-api 原生支持的站点自定义选项，不涉及代码行为变化。
