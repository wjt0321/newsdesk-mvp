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

## 2. 色彩体系：最大的一锅乱炖

### 问题 2.1：主题色定义不错，但页面"不领情"

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

**建议**：`BriefingPage` 全部替换为主题色。例如：
- `text-gray-900` → `text-text-primary`
- `bg-gray-50` → `bg-background`
- `bg-blue-600` 按钮 → `bg-accent`

---

### 问题 2.2：状态标签颜色过饱和且风格不一致

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

**建议**：统一为"低饱和、高辨识度"的配色，或者使用点状/线状指示器代替色块：
```css
/* 方案 A：全部使用带透明度的主题色 */
breaking  → bg-red-50/60   text-red-800    border border-red-100
hot       → bg-amber-50/60 text-amber-800  border border-amber-100
new       → bg-emerald-50/60 text-emerald-800 border border-emerald-100
developing→ bg-sky-50/60   text-sky-800    border border-sky-100
stable    → bg-slate-50/60 text-slate-600  border border-slate-100

/* 方案 B：只用左侧竖条/圆点表示状态，标签本身去色 */
```

---

### 问题 2.3：`text-secondary` 对比度不足

`#5F6368` 在 `#F7F4EF` 背景上的对比度约为 4.5:1，刚刚踩线。但在更小的字号（`text-[10px]`、`text-xs`）下，阅读体验会下降，特别是长时间阅读时眼睛容易疲劳。

**建议**：将 `text-secondary` 加深到 `#4A4F55` 左右，或确保小于 `text-sm` 的字体使用 `text-primary` 配合 `opacity-60`。

---

### 问题 2.4：错误/警告状态色泛滥

`TodayPage`、`StoriesPage`、`SourcesPage`、`WatchlistPage`、`ChannelsPage`、`SourceHealthPage` 的错误提示都用了一模一样的红底白字大卡片：
```
bg-red-50 border-red-200 rounded-xl p-6 text-center
```

这个红色块在页面中央非常刺眼，但用户其实只想知道"出错了，请重试"。

**建议**：错误提示不需要整个卡片都红。可以：
- 图标保持红色
- 文字保持 `text-primary`
- 背景用 `bg-surface` + 左侧 `border-l-4 border-red-400`
- 按钮保持 `bg-accent`（蓝色），不要用红按钮——红按钮通常表示"危险操作"，而不是"重试"

---

## 3. 侧边栏：最影响第一印象的组件

### 问题 3.1：64px 太窄，中文挤压严重

`AppShell` 中导航栏只有 `w-16`（64px），每个导航项是上下堆叠的图标 + 文字：
```
<Icon className="w-5 h-5" />
<span className="text-[10px] font-medium">{label}</span>
```

在 64px 宽度内，10px 的中文字（"来源健康"）几乎必然被挤压或换行。实际上你用了 `truncate` 吗？没有。所以文字只能硬塞进 64px，结果是字距非常紧，可读性差。

### 问题 3.2：激活状态不明显

激活态：`text-accent bg-blue-50`
- 图标变蓝色，背景变浅蓝色。但因为侧边栏本身已经是白色/米白，这个浅蓝色在 `#F7F4EF` 大背景上几乎看不出来。
- 没有左边缘指示条（active indicator），用户需要刻意辨认才知道自己在哪个页面。

### 问题 3.3：悬停和激活状态混为一谈

```
hover:text-text-primary hover:bg-background
```

`hover:bg-background` 在 `#F7F4EF` 大背景下是"悬停时变回背景色"——也就是悬停时导航项反而"融入"背景，这在视觉上很不合理。

**建议**：
- 将侧边栏加宽到 `w-20`（80px）或 `w-24`（96px），或者干脆改为横向图标+右侧文字的 `w-56` 侧边栏（看板类产品的标准做法）。
- 激活状态加左侧 3px 蓝色竖条：`border-l-3 border-accent` 或 `before:` 伪元素。
- 悬停状态用 `hover:bg-surface/80` 或微暗的 `hover:bg-stone-100`。
- 文字字号升到 `text-xs`（12px），不要再用 10px。

---

## 4. 排版与层级：看不出主次

### 问题 4.1：所有页面标题都一样大

- `TodayPage`：`text-2xl font-semibold`
- `StoriesPage`：`text-2xl font-semibold`
- `SourcesPage`：`text-2xl font-semibold`
- `BriefingPage`：`text-2xl font-bold`

**7 个页面标题在视觉上是完全平等的**。但"今日"作为首页，应该有更强的视觉锚点；而"简报"作为深度阅读页面，标题可以更加克制。

**建议**：
- 首页标题可以更大：`text-3xl font-bold tracking-tight`
- 内容页标题保持 `text-2xl font-semibold`
- 添加副标题/面包屑或当前时间（"2026年6月16日 星期二"），让首页更有"日报感"

---

### 问题 4.2：小标题（Section Title）被淹没

`FocusStrip`、`VisualBoard`、`TextFeed`、`RisingNow` 的标题都是：
```
<h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
```

**问题**：
- `uppercase` 对中文**无效**，这是纯英文排版习惯，写在中文项目里多余。
- `tracking-wide` 对中文来说会加大字间距，反而显得松散。
- `text-sm text-text-secondary` 让小标题和正文标签（如来源标签）字号接近，没有层级差异。

**建议**：
```html
<h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
  <span className="w-1 h-4 rounded-full bg-accent"></span>
  焦点
</h2>
```
用左侧色条 + 正常字距，比 `uppercase tracking-wide` 更适合中文。

---

### 问题 4.3：正文行高不够

`StoryCard` 的标题：`leading-snug`（约 1.375）。中文在 14px 字体下用 1.375 行高容易"上下打架"，尤其是长标题换行时。

**建议**：中文标题行高至少 `leading-relaxed`（1.625），正文可以 `leading-relaxed` 到 `leading-loose`。

---

## 5. 间距与节奏：没有呼吸感

### 问题 5.1：`mb-6` 被滥用

几乎每个模块之间的间距都是 `mb-6`（24px）或 `gap-6`（24px）。这导致：
- 小模块（如 `FocusStrip` 的一行 5 个卡片）和 大模块（如 `VisualBoard` + `TextFeed` 的 grid）之间间距一样
- 视觉节奏单调，没有"这里该密一点，那里该疏一点"

**建议**：引入间距层级：
- 相关的小元素之间：`gap-2` / `gap-3`（8-12px）
- 同一模块内的卡片之间：`gap-4`（16px）
- 不同模块之间：`gap-8` / `mb-8`（32px）
- 页面内容区和页面边界：`px-8 py-8`（32px）而非 `p-6`（24px）

---

### 问题 5.2：卡片内部 padding 太小

`StoryCard` compact 版：`p-3`（12px）。里面要塞：标题、状态标签、来源数、文章数、热度、时间、来源标签栏。12px 在 PC 屏幕上非常拥挤。

**建议**：`p-4`（16px）起步，重要卡片可以 `p-5`（20px）。信息密度不是越高越好，留白能帮助大脑快速定位信息。

---

### 问题 5.3：来源标签被截断得几乎不可读

```
<span className="... truncate max-w-[80px]">{name}</span>
```

80px 宽的中文标签，大概只能显示 3-4 个汉字。"澎湃新闻" → "澎湃..."，"纽约时报" → "纽约..."，已经失去意义。

**建议**：
- 去掉 `max-w-[80px]`，改用 `max-w-[120px]`
- 或者来源标签不使用边框，改为纯文字 + 竖线分隔，如："来源：澎湃新闻 / 财新 / 36氪..."
- 超过 4 个来源时直接显示 "+3"，不要每个都截断显示

---

## 6. 圆角与边框：毫无章法

项目中出现的圆角：
- `rounded-md`（6px）—— 按钮、时间选择器
- `rounded-lg`（8px）—— 输入框、筛选按钮、标签
- `rounded-xl`（12px）—— 卡片、容器、表格
- `rounded-full`—— 状态标签、圆点
- `rounded-2xl` —— 没有使用

**问题**：没有"圆角系统"的概念。小元素（标签、按钮）和大元素（卡片、表格）圆角几乎一样，导致小元素不够精致，大元素不够稳重。

**建议**：建立层级：
- 小元素（标签、小按钮、圆点）：`rounded-full` 或 `rounded`（4px）
- 中等元素（输入框、按钮）：`rounded-lg`（8px）
- 大元素（卡片、容器）：`rounded-xl`（12px）或 `rounded-2xl`（16px）
- 整个页面/表格：`rounded-xl` 或 `overflow-hidden rounded-xl`

---

## 7. 阴影与深度：全部"躺平"在屏幕上

目前使用的阴影只有：
```
shadow-sm    → 几乎没有存在感
shadow-md    → 稍微有一点
hover:shadow-md → 悬停时稍微浮起来
```

**问题**：在 `#F7F4EF` 暖色背景上，灰色阴影的对比度非常低，卡片和背景之间的边界主要靠边框（`border-border`）区分。这就导致所有东西都是"贴"在背景上的，没有"层"的概念。

**建议**：
- 给 `surface` 卡片添加微妙的暖色阴影（偏米/偏棕）：
  ```css
  box-shadow: 0 1px 3px rgba(74, 62, 46, 0.04), 0 1px 2px rgba(74, 62, 46, 0.08);
  ```
  或者 Tailwind 自定义：`shadow-card: 0 1px 3px rgba(0,0,0,0.05)`
- 抽屉/弹窗使用更强的阴影：`shadow-2xl` 或 `shadow-drawer`
- 悬停时不仅加阴影，还可以配合 `translate-y-[-2px]` 产生轻微上浮感

---

## 8. 布局与网格：今日页面的"三列混搭"

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

**建议**：
- 考虑将 `VisualBoard` 放在顶部作为横向滚动的图片带（`overflow-x-auto`），下方全宽留给 `TextFeed`。
- 或者改为 3:2（图片区占 3 列，文字区占 2 列），让图片更有展示空间。
- 或者干脆 `VisualBoard` 和 `TextFeed` 上下堆叠，减少横向布局的复杂度。

---

## 9. 表格：SourcesPage 的"列数灾难"

`SourcesPage` 表格有 10 列：
```
名称 | 类型 | 分类 | URL | 状态 | 健康度 | 上次抓取 | 错误 | 最后错误 | 操作
```

在 `max-w-6xl`（72rem ≈ 1152px）的容器内，10 列平均只有 115px 宽。加上 padding，每列实际内容宽度不到 100px。

**问题**：
- "URL" 列被截断到几乎不可读（`truncate max-w-[200px]`）
- "最后错误" 消息被截断（`truncate max-w-[200px]`）
- 在小屏幕上必然出现横向滚动条

**建议**：
- 将部分信息移入展开行或抽屉（`StoryDrawer` 模式），表格只保留核心列：
  - 名称 | 分类 | 状态 | 健康度 | 上次抓取 | 操作
- "URL" 可以只在名称下方显示一行小字，不需要单独列
- "错误" 和 "最后错误" 合并为一列，并在有错误时显示一个可点击的警告图标
- 操作列的三个按钮（启用/禁用、抓取、删除）可以合并为一个下拉菜单，节省宽度

---

## 10. 交互与微动效：几乎没有

### 问题 10.1：抽屉（StoryDrawer）打开太生硬

```html
<aside className="fixed inset-y-0 right-0 w-full max-w-md ... z-50">
```

没有 `transition`、`transform` 或 `animation`，点击后抽屉瞬间出现，非常生硬。

**建议**：添加 `transition-transform duration-300 ease-out`，从 `translate-x-full` 滑入到 `translate-x-0`。

---

### 问题 10.2：按钮和卡片只有颜色变化

```css
hover:bg-background hover:text-text-primary
```

交互反馈只有颜色变化，没有：
- 轻微的缩放（`active:scale-[0.98]`）
- 上浮效果（`hover:-translate-y-0.5`）
- 阴影变化（`hover:shadow-md`）

**建议**：给可点击卡片添加：
```css
transition-all duration-200 ease-out
hover:shadow-md hover:-translate-y-0.5
active:scale-[0.99]
```

---

### 问题 10.3：加载状态没有品牌感

所有加载状态都是：
```
<Loader2 className="w-5 h-5 animate-spin mr-2" />
```

没有骨架屏（Skeleton），没有品牌色加载动画，没有有趣的占位图形。

**建议**：
- 给 `HealthStats` 的 skeleton 使用动画渐变（`bg-gradient-to-r from-background via-surface to-background animate-shimmer`）
- 给长列表（`TextFeed`、`StoriesPage`）添加骨架屏卡片，而不是一个孤零零的 spinner

---

## 11. 一些细节遗漏

### 11.1：`index.html` 标题还是 "frontend"

```html
<title>frontend</title>
```

应该改为 `NewsDesk` 或 `NewsDesk - 新闻聚合看板`。

---

### 11.2：来源管理表单没有视觉分组

`SourcesPage` 的添加表单中，所有输入框都在一个 `grid grid-cols-1 sm:grid-cols-2 gap-3` 里，没有区分：
- 必填项（名称、URL）
- 选填项（分类、类型、语言、地区）

**建议**：
- 必填项放在上面，用分割线或间距和选填项分开
- 高级选项可以收在 `Accordion` 或 `details/summary` 里，不要只用一行文字链接

---

### 11.3：TopBar 的搜索框在滚动时消失

```html
<main className="flex-1 overflow-auto p-6">
```

搜索框在 `TopBar` 里，而 `TopBar` 不是 sticky 的。当用户往下滚动看报道时，搜索框消失在上方，想再次搜索必须滚回顶部。

**建议**：`TopBar` 加 `sticky top-0 z-30`，或者搜索框独立于 `TopBar` 成为内容区的 sticky 元素。

---

### 11.4：StoriesPage 的筛选器和排序器在滚动时也消失

用户滚动浏览 200 条报道时，无法随时切换排序方式或筛选状态。

**建议**：筛选栏加 `sticky top-[3.5rem] z-20 bg-background/95 backdrop-blur-sm`，滚动时浮在内容上方。

---

### 11.5：表格的 hover 态只有行变色

```css
hover:bg-background/50 transition-colors
```

这太保守了。可以尝试：
- hover 时左侧出现 `border-l-2 border-accent` 的指示条
- 或者 hover 时行内文字稍微变深（`text-primary`），未 hover 的行保持 `text-secondary` 以形成对比

---

## 12. 改进优先级建议

如果只能改三件事，建议按这个顺序：

| 优先级 | 改动 | 影响面积 |
|--------|------|----------|
| P0 | 统一色彩体系（先修复 `BriefingPage`，再统一状态标签） | 全站 |
| P0 | 加宽侧边栏 + 改进激活态 | 全局导航 |
| P1 | 引入间距层级（模块之间 mb-8，内部 mb-4） | 全站 |
| P1 | 给表格增加抽屉/展开行，减少列数 | SourcesPage |
| P2 | 添加抽屉滑入动画 | 交互体验 |
| P2 | 重写 Section Title 样式（去掉 uppercase） | 今日页 |
| P2 | TopBar / 筛选栏 sticky | 交互体验 |
| P3 | 自定义暖色阴影 | 视觉质感 |
| P3 | 骨架屏替代 spinner | 加载体验 |

---

## 13. 快速自检清单（改完后对照）

- [ ] 所有页面不再使用 `gray-xxx` 颜色，全部使用 `text-primary`、`text-secondary`、`accent` 等主题色
- [ ] 没有 `uppercase` 和 `tracking-wide` 出现在中文文本上
- [ ] 侧边栏宽度 ≥ 80px，激活态有左侧指示条
- [ ] 表格列数 ≤ 7，过长的信息移入展开行或抽屉
- [ ] 按钮/卡片有 `hover:-translate-y-0.5 hover:shadow-md` 或类似的微动效
- [ ] 模块之间大间距（32px），模块内部小间距（12-16px）
- [ ] 错误提示不是全红卡片，而是左侧带色条的中性卡片
- [ ] 标题行高 ≥ 1.625（`leading-relaxed`）
- [ ] 来源标签可读（至少显示 4-5 个汉字）
- [ ] 抽屉/弹窗有滑入动画
