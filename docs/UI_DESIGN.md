# AIAccounting — UI 设计规范

> 本文档定义了应用的视觉设计系统，包括色彩、排版、组件样式、间距和动效规范。
> 所有 UI 组件必须遵循此规范，确保全应用视觉一致性。

---

## 1. 设计参考

设计源文件保存在 `docs/design/` 目录：

| 文件 | 内容 |
|------|------|
| `design-full-overview.png` | 完整 5 屏概览（首页 / 快捷入口 / AI 记账 / 交易详情 / 设置） |
| `design-ai-entry.png` | AI 记账页面详细设计 |
| `design-stats-settings.png` | 统计页面 + 设置页面设计 |

### 设计风格关键词

- **温暖专业**：深绿色调传达信赖感，浅绿渐变营造亲和感
- **iOS 原生风格**：圆角卡片、分组列表、系统级手势交互
- **信息密度适中**：首页不超过 3 个信息层级，避免滚动过深
- **微交互**：按钮按压反馈、卡片轻微阴影提升、列表项 scale 动画

---

## 2. 色彩系统

### 2.1 主色板 (Green Theme - Light)

| Token | 色值 | 用途 |
|-------|------|------|
| `primary` | `#2D6A4F` | 主色调：Tab 选中、按钮、标题 |
| `primaryLight` | `#40916C` | 次要强调：hover、secondary buttons |
| `primarySurface` | `#E8F5E9` | 极浅绿：badge 背景、选中状态底色 |
| `primaryGradientStart` | `#2D6A4F` | 渐变起始色（月度卡片） |
| `primaryGradientEnd` | `#52B788` | 渐变结束色（月度卡片） |

### 2.2 中性色

| Token | 色值 | 用途 |
|-------|------|------|
| `background` | `#F6FAF7` | 全局页面背景（微绿调灰白） |
| `surface` | `#FFFFFF` | 卡片/列表背景 |
| `surfaceElevated` | `#F0F5F1` | 层级区分的浅色 |
| `text` | `#1A1A2E` | 主文字（近黑） |
| `textSecondary` | `#6B7280` | 次要文字（灰色） |
| `textOnPrimary` | `#FFFFFF` | 主色上的文字 |

### 2.3 语义色

| Token | 色值 | 用途 |
|-------|------|------|
| `income` | `#2D6A4F` | 收入金额显示 |
| `expense` | `#DC3545` | 支出金额显示 |
| `warning` | `#F59E0B` | 预算警告 |
| `divider` | `#E5E7EB` | 分割线 |

### 2.4 深色模式

| Token | Light | Dark |
|-------|-------|------|
| `primary` | `#2D6A4F` | `#52B788` |
| `background` | `#F6FAF7` | `#0F1A14` |
| `surface` | `#FFFFFF` | `#1A2E23` |
| `surfaceElevated` | `#F0F5F1` | `#243B2F` |
| `text` | `#1A1A2E` | `#E8F5E9` |
| `textSecondary` | `#6B7280` | `#9CA3AF` |
| `expense` | `#DC3545` | `#FF6B6B` |
| `income` | `#2D6A4F` | `#52B788` |

### 2.5 使用规则

```typescript
// ✅ 正确：通过 hook 获取主题色
const colors = useThemeColors();
<View style={{ backgroundColor: colors.surface }} />

// ❌ 错误：硬编码颜色
<View style={{ backgroundColor: '#FFFFFF' }} />
```

所有组件必须通过 `useThemeColors()` 获取颜色，禁止直接使用十六进制值。

---

## 3. 排版

### 字体

```typescript
// iOS: 系统字体 (SF Pro)
// Android: 默认字体
// Web: CSS 变量
Fonts = {
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  android: { sans: 'normal', serif: 'serif', mono: 'monospace' },
  web: { sans: 'var(--font-display)', ... }
}
```

### 字号规范

| 级别 | 大小 | 权重 | 用途 |
|------|------|------|------|
| H1 | 28px | Bold | 页面大标题 |
| H2 | 22px | Bold | 区块标题 |
| H3 | 18px | SemiBold | 卡片标题 |
| Body | 16px | Regular | 正文 |
| Caption | 14px | Regular | 次要信息 |
| Small | 12px | Regular | 标签、时间戳 |
| Amount (Large) | 32px | Bold | 金额大字显示 |
| Amount (Normal) | 16px | SemiBold | 列表金额 |

---

## 4. 间距系统

```typescript
Spacing = {
  half: 2,    // 微间距
  one: 4,     // 紧凑间距
  two: 8,     // 元素内部间距
  three: 16,  // 元素间距
  four: 24,   // 区块间距
  five: 32,   // 大区块间距
  six: 64,    // 页面边距
}
```

### 常用间距场景

| 场景 | 间距值 |
|------|--------|
| 页面水平边距 | 16px (`three`) |
| 卡片内部 padding | 16px (`three`) |
| 卡片之间垂直间距 | 16px (`three`) |
| 列表项垂直间距 | 8px (`two`) |
| 图标与文字间距 | 8px (`two`) |
| 区块标题与内容间距 | 12px |

---

## 5. 圆角

```typescript
BorderRadius = {
  sm: 8,      // 按钮、标签
  md: 12,     // 列表项、输入框
  lg: 16,     // 卡片
  xl: 24,     // 大卡片、模态框
  full: 9999, // 圆形按钮、头像
}
```

---

## 6. 阴影

### iOS

```typescript
Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  fab: {
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
}
```

### Android

```typescript
Shadows = {
  card: { elevation: 2 },
  elevated: { elevation: 6 },
  fab: { elevation: 8 },
}
```

---

## 7. 组件规范

### 7.1 月度总结卡片 (MonthlySummaryCard)

```
┌──────────────────────────────────┐
│  渐变背景: #2D6A4F → #52B788     │
│  圆角: xl (24px)                  │
│  内边距: 20px                     │
│                                   │
│  "本月总支出"  (14px, 白色半透明)  │
│  "¥4,820"     (32px, 白色, Bold)  │
│                                   │
│  ┌────────┬────────┬────────┐    │
│  │ 收入    │ 支出    │ 结余    │    │
│  │ ¥8,100 │ ¥4,250 │ ¥3,850 │    │
│  └────────┴────────┴────────┘    │
│  (半透明白色背景, 圆角 md)         │
└──────────────────────────────────┘
```

### 7.2 快捷入口 (QuickEntryGrid)

```
  ┌──────┐   ┌──────┐   ┌──────┐
  │ 🎙️   │   │ ✏️   │   │ 📷   │
  │      │   │      │   │      │
  │ 语音  │   │ 手动  │   │ 扫描  │
  └──────┘   └──────┘   └──────┘
  
  圆形背景: primarySurface (#E8F5E9)
  图标颜色: primary (#2D6A4F)
  尺寸: 56x56px
  文字: 12px, textSecondary
```

### 7.3 交易列表项 (TransactionItem)

```
  ┌───────────────────────────────────┐
  │ 🍔 │ 午饭            │  -¥32.00  │
  │    │ [餐饮] [社交]    │  12:30    │
  └───────────────────────────────────┘
  
  左侧: 分类图标 (Ionicons) + 彩色圆形背景 (36x36px)
  中间: 备注 (16px, text) + 分类标签 (chips, 12px)
  右侧: 金额 (16px, expense/income 色) + 时间 (12px, textSecondary)
```

### 7.4 设置行 (SettingsRow)

```
  ┌─────────────────────────────────────┐
  │ 🟢 │ 默认货币           CNY ¥  ›  │
  │ 🔵 │ 语言               中文    ›  │
  │ 🟣 │ 深色模式             🔘 ON     │
  └─────────────────────────────────────┘
  
  左侧: 彩色圆角方形背景 (32x32px) + 白色图标
  中间: 标题 (16px, text)
  右侧: 当前值 (14px, textSecondary) + 箭头 / Toggle
  分组: 圆角卡片 (lg) + 区域标题 (caption, textSecondary, uppercase)
```

---

## 8. Tab Bar 规范

```
┌──────┬──────┬──────────┬──────┬──────┐
│ 🏠   │ 📊   │   ➕     │ 📋   │ ⚙️   │
│ 首页  │ 统计  │         │ 账单  │ 设置  │
└──────┴──────┴──────────┴──────┴──────┘

- 背景: tabBar (#FFFFFF / #1A2E23)
- 上边线: tabBarBorder
- 未选中图标: tabIconDefault (#9CA3AF / #6B7280)
- 选中图标+文字: tabIconSelected (#2D6A4F / #52B788)
- 中间 FAB: 56x56px, 主色背景, 白色 + 图标, 带阴影
- 文字大小: 10px
- 图标大小: 24px
```

---

## 9. 交互动效

| 交互 | 动效 | 参数 |
|------|------|------|
| 按钮按压 | scale 缩小 | 0.95, 100ms |
| 卡片按压 | scale 缩小 + opacity 降低 | 0.98, 150ms |
| 页面切换 | native push/pop | 系统默认 |
| Modal 弹出 | 底部滑入 | 300ms, ease-out |
| 列表加载 | fade in + slide up | 200ms, 逐项延迟 50ms |
| 语音按钮活跃 | 脉冲动画 | infinite, 1.5s cycle |
| 数据刷新 | 短暂 opacity 闪烁 | 200ms |

---

## 10. 响应式策略

| 断点 | 策略 |
|------|------|
| 手机 (< 428px) | 全宽布局，单列 |
| 平板 (428-800px) | 内容居中，最大宽度 800px |
| Web (> 800px) | 居中容器 800px，两侧留白 |

```typescript
MaxContentWidth = 800;
BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
```
