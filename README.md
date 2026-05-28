# AIAccounting — AI 智能多维度记账

<p align="center">
  <strong>🤖 AI 驱动 · 📊 多维分析 · 🌐 中英双语 · 📱 跨平台</strong>
</p>

> 一款以 AI 智能解析为核心的个人记账应用。用自然语言描述账单，AI 自动识别金额、日期、备注和分类，支持多维度分类归属，实现灵活的支出分析。

---

## ✨ 核心特性

- 🤖 **AI 智能记账** — 自然语言输入，AI 自动解析结构化数据
- 🎙️ **语音输入** — 语音转文字，配合 AI 记账
- 📊 **多维统计** — 按分类、时段、支出结构（日常/固定/弹性）分析
- 🏷️ **多对多分类** — 一笔交易可归属多个分类
- 🌐 **中英双语** — 系统跟随 + 手动切换
- 🌗 **深色模式** — 自动适配 + 手动切换
- 💱 **多币种** — CNY / USD / EUR / JPY 等
- 📱 **跨平台** — iOS / Android / Web

## 🛠️ 技术栈

| 层 | 技术 |
|----|------|
| 框架 | React Native 0.85 + Expo SDK 56 |
| 语言 | TypeScript 6 |
| 路由 | expo-router (file-based routing) |
| 数据 | expo-sqlite (SQLite WAL) |
| AI | OpenAI / DeepSeek (可配置) |
| i18n | i18next + react-i18next |
| 动画 | react-native-reanimated |

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run start

# 按平台启动
npm run ios       # iOS 模拟器
npm run android   # Android 模拟器
npm run web       # 浏览器
```

## 📖 文档

| 文档 | 说明 |
|------|------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 项目架构、目录结构、数据流、导航、AI 流程 |
| [UI_DESIGN.md](docs/UI_DESIGN.md) | UI 设计规范：色彩、排版、组件、间距、动效 |
| [DATABASE.md](docs/DATABASE.md) | 数据库设计：表结构、ER 图、查询模式、迁移策略 |
| [docs/design/](docs/design/) | 设计参考图（3 张 PNG） |

## 📁 项目结构

```
src/
├── app/            # 页面 (expo-router)
│   ├── index.tsx   # 🏠 首页仪表盘
│   ├── stats.tsx   # 📊 支出统计
│   ├── ledger.tsx  # 📋 账单列表
│   ├── settings.tsx# ⚙️ 设置
│   └── ai.tsx      # 🤖 AI 记账
├── components/     # 共享组件
├── constants/      # 主题系统
├── context/        # 全局状态
├── database/       # SQLite 数据层
├── hooks/          # 自定义 hooks
├── i18n/           # 国际化
└── utils/          # 工具函数 (AI / 货币)
```

## 📄 License

[MIT](LICENSE)
