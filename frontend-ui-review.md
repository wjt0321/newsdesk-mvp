# NewsDesk 前端视觉改进建议

> 本文档基于对 `frontend/src/` 全量只读审查生成，只指出问题并提供改进方向，**不涉及代码修改**。

---

## 1. 总体印象：为什么"觉得丑但说不出来"

核心原因：**缺乏设计系统的一致性**。每个页面、每个组件都在用 Tailwind 的原子类自由组合，导致：
- 同样功能的颜色/间距/圆角在不同组件写法不同
- 没有清晰的视觉层级（哪里是标题、哪里是辅助信息、哪里是交互元素）
- 所有元素都"平铺"在同一平面上，没有深浅、强弱、疏密的节奏

以下按模块逐条分析。

---

## 2. 参考风格：Apple Design + Codex Interface

在给出具体修改建议前，先明确两个参考系——**苹果的 Human Interface Guidelines** 和 **OpenAI Codex 的界面风格**。前者解决"美和阅读体验"，后者解决"效率和工具感"。

---

### 2.1 苹果设计（Apple HIG）可借鉴什么

苹果的设计哲学是 **"Clarity（清晰）、Hierarchy（层级）、Aesthetic Integrity（审美完整）"**。具体到 NewsDesk 这种"阅读+工具"混合的产品：

| 苹果原则 | 在 NewsDesk 中的映射 | 当前问题 |
|---------|---------------------|---------|
| **大量留白** | 模块之间、卡片内部都需要呼吸空间 | 所有模块都用 `mb-6`，没有节奏 |
| **内容优先，UI 退后** | 导航、筛选器、状态标签不应该抢夺报道的注意力 | 状态标签用了高饱和彩色块，比标题还抢眼 |
| **柔和圆角 + 微妙阴影** | 卡片用 `rounded-2xl`（16px）+ 暖色阴影 | 目前大小圆角混用，阴影几乎不存在 |
| **玻璃拟态（Liquid Glass）** | 导航栏、TopBar 可以用半透明 + 模糊背景 | 目前所有背景都是实色，没有层级感 |
| **Spring 动画** | 抽屉滑入、卡片悬停使用弹性缓动 | 目前只有 `transition-colors`，没有位移/缩放 |
| **清晰的字体层级** | 标题 → 副标题 → 正文 → 辅助信息，字号/字重/颜色严格区分 | 所有页面标题都是 `text-2xl font-semibold` |
| **圆点/细线状态指示** | 用圆点或左侧色条表示状态，而不是彩色块 | 状态标签用了大面积 `bg-red-100` 色块 |

> **关键洞察**：苹果从不用 "彩色背景块 + 彩色文字" 做标签。它的状态指示要么是**一个小圆点**（如 iMessage 状态），要么是**左侧一条细线**（如邮件未读），要么是**微妙的文字颜色变化**。这样状态信息存在但不喧宾夺主。

---

### 2.2 Codex 界面风格可借鉴什么

Codex 是 OpenAI 的 AI 编程工具，它的界面风格是典型的 **"开发者 IDE 分栏"** 设计。NewsDesk 本身也是"左侧导航 + 右侧内容"的仪表板，结构上和 Codex 很相似：

| Codex 特征 | 在 NewsDesk 中的映射 | 当前问题 |
|-----------|---------------------|---------|
| **分栏布局（Split View）** | 左侧固定导航，右侧可滚动内容区 | 侧边栏只有 64px，中文文字被压扁 |
| **深色/暗色侧边栏** | 左侧导航可以用深色背景，与内容区形成对比 | 目前侧边栏和背景都是浅色，没有分界 |
| **文件树式导航** | 当前页面在导航中有明确高亮 + 左侧指示条 | 激活态只有 `bg-blue-50`，几乎看不见 |
| **命令面板（Command Palette）** | 搜索框可以做成全局浮动，随时唤起 | 搜索框在 TopBar 里，滚动时消失 |
| **状态指示明确** | 运行中/成功/失败用图标 + 颜色 + 动画 | 状态标签风格不一致，错误提示太刺眼 |
| **代码高亮/语法着色** | 报道中的来源、标签、时间可以用微妙颜色区分 | 所有辅助信息都是 `text-text-secondary` |
| **流式输出/实时反馈** | 加载状态用骨架屏而非 spinner | 目前全是 `Loader2` 转圈 |
| **面板式组织（Panels）** | 抽屉/弹窗从右侧滑入，带遮罩 | 抽屉没有动画，瞬间弹出 |

> **关键洞察**：Codex 的深色侧边栏 + 浅色内容区 是一种经典的"工具型产品"布局。它天然区分了"导航空间"和"工作空间"，让用户的注意力始终聚焦在右侧内容。NewsDesk 作为"阅读工具"，非常适合这种结构。

---

### 2.3 两种风格的融合方案

**NewsDesk 是"阅读工具"**，不是消费级 App，也不是纯 IDE。建议融合方向：

```
┌─────────────────────────────────────────────────────┐
│  🟦 侧边栏（Codex 风格）                              │
│  • 深色背景（如 #1C1C1E 或 #F5F5F7 的深色变体）       │
│  • 激活项有左侧蓝色指示条 + 微妙背景色                 │
│  • 文字清晰，图标+文字纵向排列，宽度 ≥ 80px           │
│                                                      │
│  🟨 内容区（Apple 风格）                              │
│  • 大量留白，卡片用 rounded-2xl + 暖色阴影            │
│  • 标题层级清晰，正文行高充足                         │
│  • 状态用圆点/细线，不用彩色块                       │
│  • 玻璃拟态 TopBar：半透明 + 模糊 + 底部细线          │
│  • 抽屉从右侧弹性滑入                                 │
└─────────────────────────────────────────────────────┘
```

---

## 3. 色彩体系：最大的一锅乱炖

### 问题 3.1：主题色定义不错，但页面"不领情"

`tailwind.config.js` 定义了主题色：
```js
colors: {
  background: "#F7F4EF",  // 暖米色
  surface:    "#FFFFFF",     // 纯白卡片
  "text-primary":   "#161616",
  "text-secondary": "#5F6368",
  border:     "#DED8CC",
  accent:     "#2563EB",   // 标准蓝
  amber:      "#D89A2B",
}
```

这套配色本身是有方向感的（偏报纸/阅读感），但 `BriefingPage` 完全绕开了这套系统：
- 使用 `text-gray-900`、`text-gray-500`、`text-gray-600`
- 使用 `bg-gray-50`、`bg-white`
- 按钮用 `bg-blue-600`
- 表格头用 `bg-gray-50 text-gray-700`

**结果**：简报页面看起来像是从另一个项目复制粘贴过来的，和其他页面完全不搭。

**建议（Apple 风格）**：`BriefingPage` 全部替换为主题色。例如：
- `text-gray-900` → `text-text-primary`
- `bg-gray-50` → `bg-background`
- `bg-blue-600` 按钮 → `bg-accent`
- 表格头改为 `bg-surface border-b border-border`（无背景色，只用底边线区分）

---

### 问题 3.2：状态标签颜色过饱和且风格不一致

`StoryCard`、`FocusStrip`、`VisualBoard`、`StoryDrawer` 中状态标签都用了 Tailwind 的 100/700 浅色组合：
```
breaking → bg-red-100   text-red-700
hot      → bg-amber-100 text-amber-700
new      → bg-green-100 text-green-700
developing → bg-blue-100 text-blue-700
stable   → bg-gray-100 text-text-secondary
```

**问题**：
- 在 `#F7F4EF` 暖米色背景上，这些高饱和的彩色标签像"贴上去"的贴纸，不融入整体。
- `VisualBoard` 的图片卡片上使用了 `bg-red-500 text-white`（实心彩色），和其他页面又是完全不同的风格。

**建议（Apple 风格）**：统一为"低饱和、高辨识度"的配色，或者使用点状/线状指示器代替色块：
```css
/* 方案 A：苹果式圆点 + 文字颜色变化 */
<span class="flex items-center gap-1.5">
  <span class="w-2 h-2 rounded-full bg-red-500"></span>
  <span class="text-sm font-medium text-red-700">突发</span>
</span>

/* 方案 B：卡片左侧竖条（类似 Apple Mail 未读） */
<article class="border-l-3 border-red-500 pl-4 ...">

/* 方案 C：纯文字 + 颜色（Apple 最克制的方式） */
<span class="text-sm font-medium text-red-600">突发</span>
```

---

### 问题 3.3：`text-secondary` 对比度不足

`#5F6368` 在 `#F7F4EF` 背景上的对比度约为 4.5:1，刚刚踩线。但在更小的字号（`text-[10px]`、`text-xs`）下，阅读体验会下降，特别是长时间阅读时眼睛容易疲劳。

**建议（Apple 风格）**：将 `text-secondary` 加深到 `#4A4F55` 左右，或确保小于 `text-sm` 的字体使用 `text-primary` 配合 `opacity-60`。苹果在辅助信息上通常用 `opacity-60` 而非一个固定的灰色，这样在不同背景上都能保持正确的对比度。

---

### 问题 3.4：错误/警告状态色泛滥

`TodayPage`、`StoriesPage`、`SourcesPage`、`WatchlistPage`、`ChannelsPage`、`SourceHealthPage` 的错误提示都用了一模一样的红底白字大卡片：
```
bg-red-50 border-red-200 rounded-xl p-6 text-center
```

这个红色块在页面中央非常刺眼，但用户其实只想知道"出错了，请重试"。

**建议（Apple + Codex 风格）**：错误提示不需要整个卡片都红。可以：
- 图标保持红色（`text-red-500`）
- 文字保持 `text-primary`
- 背景用 `bg-surface` + 左侧 `border-l-4 border-red-400`
- 按钮保持 `bg-accent`（蓝色），不要用红按钮——红按钮通常表示"危险操作"，而不是"重试"

参考：Codex 的错误提示是左侧红色竖线 + 中性背景，非常克制。

---

## 4. 侧边栏：最影响第一印象的组件

### 问题 4.1：64px 太窄，中文挤压严重

`AppShell` 中导航栏只有 `w-16`（64px），每个导航项是上下堆叠的图标 + 文字：
```
<Icon className="w-5 h-5" />
<span className="text-[10px] font-medium">{label}</span>
```

在 64px 宽度内，10px 的中文字（"来源健康"）几乎必然被挤压或换行。实际上你用了 `truncate` 吗？没有。所以文字只能硬塞进 64px，结果是字距非常紧，可读性差。

### 问题 4.2：激活状态不明显

激活态：`text-accent bg-blue-50`
- 图标变蓝色，背景变浅蓝色。但因为侧边栏本身已经是白色/米白，这个浅蓝色在 `#F7F4EF` 大背景上几乎看不出来。
- 没有左边缘指示条（active indicator），用户需要刻意辨认才知道自己在哪个页面。

### 问题 4.3：悬停和激活状态混为一谈

```
hover:text-text-primary hover:bg-background
```

`hover:bg-background` 在 `#F7F4EF` 大背景下是"悬停时变回背景色"——也就是悬停时导航项反而"融入"背景，这在视觉上很不合理。

**建议（Codex 风格）**：
- **方案 A（推荐）**：侧边栏改为深色背景（如 `#F5F5F7` 或更暗的 `#E8E8ED`），与内容区 `#F7F4EF` 形成微妙对比。这是 Codex 式分栏的经典做法。
- 将侧边栏加宽到 `w-20`（80px）或 `w-24`（96px），文字字号升到 `text-xs`（12px），不要再用 10px。
- 激活状态加左侧 3px 蓝色竖条：`border-l-3 border-accent` 或 `before:` 伪元素。参考 Codex 的文件树激活态。
- 悬停状态用 `hover:bg-black/5`（浅色侧边栏）或 `hover:bg-white/10`（深色侧边栏）。

```
/* 改进后的侧边栏样式示意 */
<nav className="w-20 bg-[#F5F5F7] border-r border-border flex flex-col items-center py-6 gap-4">
  <NavLink className={({isActive}) => clsx(
    "flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200",
    isActive 
      ? "text-accent bg-blue-50/50 border-l-2 border-accent -ml-[2px]"
      : "text-text-secondary hover:text-text-primary hover:bg-black/5"
  )}>
```

---

## 5. 排版与层级：看不出主次

### 问题 5.1：所有页面标题都一样大

- `TodayPage`：`text-2xl font-semibold`
- `StoriesPage`：`text-2xl font-semibold`
- `SourcesPage`：`text-2xl font-semibold`
- `BriefingPage`：`text-2xl font-bold`

**7 个页面标题在视觉上是完全平等的**。但"今日"作为首页，应该有更强的视觉锚点；而"简报"作为深度阅读页面，标题可以更加克制。

**建议（Apple 风格）**：
- 首页标题可以更大：`text-3xl font-bold tracking-tight`（参考 Apple News 今日版面）
- 内容页标题保持 `text-2xl font-semibold`
- 添加日期副标题：`"2026年6月16日 星期二"`，用 `text-sm text-text-secondary`，让首页更有"日报感"

---

### 问题 5.2：小标题（Section Title）被淹没

`FocusStrip`、`VisualBoard`、`TextFeed`、`RisingNow` 的标题都是：
```
<h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
```

**问题**：
- `uppercase` 对中文**无效**，这是纯英文排版习惯，写在中文项目里多余。
- `tracking-wide` 对中文来说会加大字间距，反而显得松散。
- `text-sm text-text-secondary` 让小标题和正文标签（如来源标签）字号接近，没有层级差异。

**建议（Apple 风格）**：
```html
<h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
  <span className="w-1 h-4 rounded-full bg-accent"></span>
  焦点
</h2>
<p className="text-sm text-text-secondary mt-1">过去 24 小时内最受关注的事件</p>
```
- 用左侧色条（4px 宽，圆角）+ 正常字距，比 `uppercase tracking-wide` 更适合中文。
- 加一句副标题说明这个 section 是什么，帮助用户快速理解内容。

---

### 问题 5.3：正文行高不够

`StoryCard` 的标题：`leading-snug`（约 1.375）。中文在 14px 字体下用 1.375 行高容易"上下打架"，尤其是长标题换行时。

**建议（Apple 风格）**：中文标题行高至少 `leading-relaxed`（1.625），正文可以 `leading-relaxed` 到 `leading-loose`（1.75）。苹果在中文环境下的行高通常比英文更宽松。

---

## 6. 间距与节奏：没有呼吸感

### 问题 6.1：`mb-6` 被滥用

几乎每个模块之间的间距都是 `mb-6`（24px）或 `gap-6`（24px）。这导致：
- 小模块（如 `FocusStrip` 的一行 5 个卡片）和 大模块（如 `VisualBoard` + `TextFeed` 的 grid）之间间距一样
- 视觉节奏单调，没有"这里该密一点，那里该疏一点"

**建议（Apple 风格）**：苹果在界面中非常注重"间距的韵律"（rhythm）。引入间距层级：
- 相关的小元素之间：`gap-2` / `gap-3`（8-12px）
- 同一模块内的卡片之间：`gap-4`（16px）
- 不同模块之间：`gap-8` / `mb-8`（32px）—— **用 32px 分隔模块，24px 留给模块内部**
- 页面内容区和页面边界：`px-8 py-8`（32px）而非 `p-6`（24px）

---

### 问题 6.2：卡片内部 padding 太小

`StoryCard` compact 版：`p-3`（12px）。里面要塞：标题、状态标签、来源数、文章数、热度、时间、来源标签栏。12px 在 PC 屏幕上非常拥挤。

**建议（Apple 风格）**：`p-4`（16px）起步，重要卡片可以 `p-5`（20px）。苹果在 iOS 中卡片的 padding 通常是 16-20px。信息密度不是越高越好，留白能帮助大脑快速定位信息。

---

### 问题 6.3：来源标签被截断得几乎不可读

```
<span className="... truncate max-w-[80px]">{name}</span>
```

80px 宽的中文标签，大概只能显示 3-4 个汉字。"澎湃新闻" → "澎湃..."，"纽约时报" → "纽约..."，已经失去意义。

**建议（Apple 风格）**：
- 去掉 `max-w-[80px]`，改用 `max-w-[120px]`
- 或者来源标签不使用边框，改为纯文字 + 竖线分隔，如："来源：澎湃新闻 / 财新 / 36氪..."
- 超过 4 个来源时直接显示 "+3"，不要每个都截断显示
- 参考 Apple News 的来源显示：小号灰色文字，无背景色，无圆角，非常克制。

---

## 7. 圆角与边框：毫无章法

项目中出现的圆角：
- `rounded-md`（6px）—— 按钮、时间选择器
- `rounded-lg`（8px）—— 输入框、筛选按钮、标签
- `rounded-xl`（12px）—— 卡片、容器、表格
- `rounded-full`—— 状态标签、圆点
- `rounded-2xl` —— 没有使用

**问题**：没有"圆角系统"的概念。小元素（标签、按钮）和大元素（卡片、表格）圆角几乎一样，导致小元素不够精致，大元素不够稳重。

**建议（Apple 风格）**：苹果在 iOS/macOS 中建立了严格的圆角层级：
- 小元素（标签、小按钮、圆点）：`rounded-full` 或 `rounded`（4px）
- 中等元素（输入框、按钮）：`rounded-lg`（8px）
- 大元素（卡片、容器）：`rounded-xl`（12px）或 `rounded-2xl`（16px）—— **苹果的大型卡片通常是 16-20px 圆角**
- 整个页面/表格：`rounded-xl` 或 `overflow-hidden rounded-xl`

> 建议：把卡片统一改成 `rounded-2xl`（16px），让大元素更有"Apple 卡片"的质感。

---

## 8. 阴影与深度：全部"躺平"在屏幕上

目前使用的阴影只有：
```
shadow-sm    → 几乎没有存在感
shadow-md    → 稍微有一点
hover:shadow-md → 悬停时稍微浮起来
```

**问题**：在 `#F7F4EF` 暖色背景上，灰色阴影的对比度非常低，卡片和背景之间的边界主要靠边框（`border-border`）区分。这就导致所有东西都是"贴"在背景上的，没有"层"的概念。

**建议（Apple 风格）**：
- 给 `surface` 卡片添加微妙的暖色阴影：
  ```css
  /* 自定义 shadow */
  box-shadow: 0 1px 3px rgba(74, 62, 46, 0.04), 0 1px 2px rgba(74, 62, 46, 0.08);
  ```
  或者 Tailwind 自定义：`shadow-card: 0 1px 3px rgba(0,0,0,0.05)`
- 抽屉/弹窗使用更强的阴影：`shadow-2xl` 或 `shadow-drawer`
- 悬停时不仅加阴影，还可以配合 `translate-y-[-2px]` 产生轻微上浮感（Apple 卡片悬停效果）
- 参考 Apple 的 shadow 哲学：**非常淡，但足够让卡片从背景中浮现**。不要用深灰色阴影，用偏暖/偏棕的阴影。

---

## 9. 布局与网格：今日页面的"三列混搭"

`TodayPage` 的核心布局：
```html
<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
  <div className="lg:col-span-2">
    <VisualBoard />   <!-- 8 张图 -->
  </div>
  <div className="lg:col-span-3">
    <TextFeed />      <!-- 40 条文字报道 -->
  </div>
</div>
```

**问题**：
- 2:3 的列比并不符合内容比例。`VisualBoard` 最多 8 张图，但 `TextFeed` 有 40 条。结果左边图区很快就翻完了，右边文字流还在滚动，视觉失衡。
- `VisualBoard` 的 `aspect-[16/10]` 在 2 列宽度下会很大，如果图片本身质量不高，会显得非常突兀。

**建议（Apple News 风格）**：
- **方案 A**：将 `VisualBoard` 放在顶部作为横向滚动的图片带（`overflow-x-auto`，类似 Apple News 的 Top Stories 轮播），下方全宽留给 `TextFeed`。
- **方案 B**：改为 3:2（图片区占 3 列，文字区占 2 列），让图片更有展示空间。
- **方案 C**：干脆 `VisualBoard` 和 `TextFeed` 上下堆叠，减少横向布局的复杂度。Apple News 在桌面端也是大量垂直堆叠，很少做复杂的横向分栏。

---

## 10. 表格：SourcesPage 的"列数灾难"

`SourcesPage` 表格有 10 列：
```
名称 | 类型 | 分类 | URL | 状态 | 健康度 | 上次抓取 | 错误 | 最后错误 | 操作
```

在 `max-w-6xl`（72rem ≈ 1152px）的容器内，10 列平均只有 115px 宽。加上 padding，每列实际内容宽度不到 100px。

**问题**：
- "URL" 列被截断到几乎不可读（`truncate max-w-[200px]`）
- "最后错误" 消息被截断（`truncate max-w-[200px]`）
- 在小屏幕上必然出现横向滚动条

**建议（Apple + Codex 风格）**：
- 将部分信息移入展开行或抽屉（`StoryDrawer` 模式），表格只保留核心列：
  - 名称 | 分类 | 状态 | 健康度 | 上次抓取 | 操作
- "URL" 可以只在名称下方显示一行小字，不需要单独列（参考 Apple 的设置面板，辅助信息在标题下方）
- "错误" 和 "最后错误" 合并为一列，并在有错误时显示一个可点击的警告图标
- 操作列的三个按钮（启用/禁用、抓取、删除）可以合并为一个下拉菜单（`...`），节省宽度——这是 Apple 和 Codex 都常用的模式

---

## 11. 交互与微动效：几乎没有

### 问题 11.1：抽屉（StoryDrawer）打开太生硬

```html
<aside className="fixed inset-y-0 right-0 w-full max-w-md ... z-50">
```

没有 `transition`、`transform` 或 `animation`，点击后抽屉瞬间出现，非常生硬。

**建议（Apple Spring 动画）**：
```css
/* 进入 */
transform: translateX(100%) → translateX(0)
transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1);

/* 遮罩 */
opacity: 0 → 1
transition: opacity 0.3s ease-out;
```
苹果使用 `cubic-bezier(0.32, 0.72, 0, 1)` 这种 spring 曲线，让动画有弹性感但不夸张。

---

### 问题 11.2：按钮和卡片只有颜色变化

```css
hover:bg-background hover:text-text-primary
```

交互反馈只有颜色变化，没有：
- 轻微的缩放（`active:scale-[0.98]`）
- 上浮效果（`hover:-translate-y-0.5`）
- 阴影变化（`hover:shadow-md`）

**建议（Apple 风格）**：给可点击卡片添加：
```css
transition-all duration-200 ease-out
hover:shadow-md hover:-translate-y-0.5
active:scale-[0.99]
```
苹果在按钮和列表项上的交互是**非常微妙的位移 + 阴影变化**，不是简单的颜色翻转。

---

### 问题 11.3：加载状态没有品牌感

所有加载状态都是：
```
<Loader2 className="w-5 h-5 animate-spin mr-2" />
```

没有骨架屏（Skeleton），没有品牌色加载动画，没有有趣的占位图形。

**建议（Apple + Codex 风格）**：
- 给 `HealthStats` 的 skeleton 使用动画渐变（`bg-gradient-to-r from-background via-surface to-background animate-shimmer`）
- 给长列表（`TextFeed`、`StoriesPage`）添加骨架屏卡片，而不是一个孤零零的 spinner
- 参考 Codex 的加载状态：它会在代码块区域先显示一个骨架条，然后流式输出内容。NewsDesk 也可以在报道卡片区域先显示骨架，然后渐入真实内容。

```css
/* shimmer 动画 */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.animate-shimmer {
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

---

## 12. 玻璃拟态（Glassmorphism）TopBar

当前 `TopBar` 是实色背景：
```
className="h-14 border-b border-border bg-surface ..."
```

滚动时 `TopBar` 没有特殊效果，和背景融为一体。

**建议（Apple Liquid Glass 风格）**：
```css
/* 玻璃拟态 TopBar */
backdrop-blur-xl bg-surface/80 border-b border-border/50
sticky top-0 z-30
```
- 半透明背景（80% 不透明度）
-  backdrop blur（背景模糊）
- 底部细边框（50% 透明度）
- 固定在顶部（sticky）
- 这样滚动时内容会从 TopBar 下方流过，TopBar 有轻微的毛玻璃效果，非常有苹果感

参考：macOS 菜单栏、iOS 导航栏都是这种风格。

---

## 13. 一些细节遗漏

### 13.1：`index.html` 标题还是 "frontend"

```html
<title>frontend</title>
```

应该改为 `NewsDesk` 或 `NewsDesk - 新闻聚合看板`。

---

### 13.2：来源管理表单没有视觉分组

`SourcesPage` 的添加表单中，所有输入框都在一个 `grid grid-cols-1 sm:grid-cols-2 gap-3` 里，没有区分：
- 必填项（名称、URL）
- 选填项（分类、类型、语言、地区）

**建议（Apple 风格）**：
- 必填项放在上面，用分割线或间距和选填项分开
- 高级选项可以收在 `details/summary` 里，不要只用一行文字链接——苹果在设置面板中常用这种"展开/收起"的分组

---

### 13.3：TopBar 的搜索框在滚动时消失

```html
<main className="flex-1 overflow-auto p-6">
```

搜索框在 `TopBar` 里，而 `TopBar` 不是 sticky 的。当用户往下滚动看报道时，搜索框消失在上方，想再次搜索必须滚回顶部。

**建议（Codex 风格）**：`TopBar` 加 `sticky top-0 z-30`，或者搜索框独立于 `TopBar` 成为内容区的 sticky 元素。Codex 的命令面板/搜索栏始终可见，这是工具型产品的标配。

---

### 13.4：StoriesPage 的筛选器和排序器在滚动时也消失

用户滚动浏览 200 条报道时，无法随时切换排序方式或筛选状态。

**建议（Apple + Codex 风格）**：筛选栏加 `sticky top-[3.5rem] z-20 bg-background/95 backdrop-blur-sm`，滚动时浮在内容上方。参考 macOS Finder 的筛选栏、Codex 的顶部工具栏。

---

### 13.5：表格的 hover 态只有行变色

```css
hover:bg-background/50 transition-colors
```

这太保守了。可以尝试：
- hover 时左侧出现 `border-l-2 border-accent` 的指示条（Codex 文件树风格）
- 或者 hover 时行内文字稍微变深（`text-primary`），未 hover 的行保持 `text-secondary` 以形成对比

---

## 14. 改进优先级建议

如果只能改三件事，建议按这个顺序：

| 优先级 | 改动 | 影响面积 | 参考风格 |
|--------|------|----------|---------|
| **P0** | 统一色彩体系（先修复 `BriefingPage`，再统一状态标签为圆点/细线） | 全站 | Apple |
| **P0** | 侧边栏加宽 + 深色背景 + 左侧激活指示条 | 全局导航 | Codex |
| **P1** | 引入间距层级（模块之间 `mb-8`，内部 `mb-4`） | 全站 | Apple |
| **P1** | 表格增加抽屉/展开行，减少列数到 6-7 列 | SourcesPage | Apple + Codex |
| **P2** | 添加抽屉滑入动画（Spring 曲线） | 交互体验 | Apple |
| **P2** | 重写 Section Title（去掉 uppercase，加左侧色条 + 副标题） | 今日页 | Apple |
| **P2** | TopBar / 筛选栏 sticky + 玻璃拟态 | 交互体验 | Apple Liquid Glass |
| **P3** | 自定义暖色阴影 + 卡片圆角统一为 `rounded-2xl` | 视觉质感 | Apple |
| **P3** | 骨架屏替代 spinner（shimmer 动画） | 加载体验 | Codex |

---

## 15. 快速自检清单（改完后对照）

- [ ] 所有页面不再使用 `gray-xxx` 颜色，全部使用 `text-primary`、`text-secondary`、`accent` 等主题色
- [ ] 没有 `uppercase` 和 `tracking-wide` 出现在中文文本上
- [ ] 侧边栏宽度 ≥ 80px，激活态有左侧指示条，考虑深色背景
- [ ] 表格列数 ≤ 7，过长的信息移入展开行或抽屉
- [ ] 按钮/卡片有 `hover:-translate-y-0.5 hover:shadow-md` 或类似的微动效
- [ ] 模块之间大间距（32px），模块内部小间距（12-16px）
- [ ] 错误提示不是全红卡片，而是左侧带色条的中性卡片
- [ ] 标题行高 ≥ 1.625（`leading-relaxed`）
- [ ] 来源标签可读（至少显示 4-5 个汉字），或改用纯文字分隔
- [ ] 抽屉/弹窗有滑入动画（Spring 曲线）
- [ ] TopBar 是 sticky + 玻璃拟态（`backdrop-blur`）
- [ ] 状态标签用圆点/细线/纯文字，不用彩色背景块
- [ ] 加载状态用骨架屏（shimmer），不是孤零零的 spinner
