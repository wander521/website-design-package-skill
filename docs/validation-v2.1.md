# v2.1.0 真实网站对照验证

2026-10-14 新增测试 **24 个不同网站**，不重复计算历史六站，也不将只完成采集的备用网站计入结果。**23 个网站完成限定范围的设计包验证**；1 个未完成站点没有成功 ZIP。

最终包全部由 **compiler 2.1.0** 编译，合计 **952 项浏览器 CSS 检查通过**。独立总审计再次使用标准 ZIP 读取器验证 CRC、恰好四个文件、归档内容与目录内容一致，以及各文件 SHA-256 与校验报告一致。**35 项回归测试通过**（27 项编译/证据/导出/打包，8 项浏览器/采集）。

## 方法与范围

每站先从实际页面独立提取并检查 1440px 桌面和 390px 手机截图，再读取对应 RICOUI 模板。保留完整字体栈、正文/标题/CTA/nav 的实际字形角色、组件填充与形状、重复 surface、响应式差异和安全交互状态。重要遗漏通过有来源记录的定向补采纠正；不能仅从 body 样式复制一个通用规范。

模板对照来自公开源码仓库固定提交 [`570aef6`](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands)。这是 deployed 品牌库的公开源码替代，**不声称与 design.ricoui.com 当前下载内容逐字节相同**。每份 DESIGN.md 和 tokens.json 的 SHA-256 已记录；未将第三方模板数值加入 publishedTokens 或观测证据。Inspired、主题、语言、路由和版本差异与抽取遗漏分别判断。

成功表示所声明页面/时间/视口/状态内的证据包可用，不表示整个品牌系统、所有路由、所有中间宽度或全部可访问性均已验证。自动采集器只是代表性采样；Codex 必须继续进行截图、角色来源及状态目标审核。Logo/公告不自动代表主 CTA。

## 本轮改进

- Framer、Cal、Spotify、Figma 等站的文字由内部 span/p 绘制：扩展字形采样，排除无文字 wrapper 的继承字体；Figma hero Get started 与导航 Get started for free 必须精确区分。
- Shopify 首屏标题是大号 div/span：增加 display-text；PostHog 的亮橙按钮前景与暗橙基座分开；Resend 主标题保留裁切到字形的渐变。
- Cohere/Framer/Figma/Expo 的匿名 fixed Cookie 面板得到识别，静态 Footer Cookie Manager 与普通 shadow testimonial 不再充当遮罩。Webflow 的 fixed consent host 只记录不可读边界，内部样式仍不声称读取。
- 状态采样跳过识别出的遮罩控件，移出鼠标、清理焦点/菜单，并保留 overlaysBeforeStates。NVIDIA 的 Escape cleanup 改变过 cookie 可见性；报告保留变化，而不是宣称从未关闭。
- 普通导航打断 read 时，只等待 DOMContentLoaded 并重读一次，不重新请求网址。字体门控拖住截图时，有时间上限的原生截图保留字体状态与限制。
- var() 由浏览器解析后验证真实属性类型；缺少 HTTP 状态、明确不完整或所有视口无观测元素的证据不能编译。部分空视口、字体仍在加载、不透明 consent host 和声明来源会产生 review 提示。

## 重要限制

Airbnb 虽可到达官方中文站，但有界补采仍未获得房源/卡片主体，不能据导航或页脚生成成功包。NVIDIA 使用明确标注的多次真实捕获补充桌面/手机证据；新版桌面采样缺口未被称为纯 v3 自动成功。截图字体超时 fallback 在本地挂起字体请求的浏览器 fixture 中复现通过，本轮最终 NVIDIA 成功捕获未实际触发该 fallback。

Spotify 的手机截图保持桌面侧栏并裁切，属于此次匿名浏览器/视口结果；Webflow Cookie 面板内部未读取；采样帽、未稳定或不可访问状态仍逐站说明。CSS 验证和来源值匹配不能代替这些语义判断。

## 每站结果

| 网站 | 最终结果 | CSS 检查 | 主要模板差异/失败 |
|---|---|---:|---|
| [airbnb](https://www.airbnb.com/) | 未完成 | 0 | Public official zh route captured, but property-listing/card body did not render after bounded stabilization. Desktop initially skeleton; later only search/navbar and destination footer. No complete style package emitted. |
| [cal](https://cal.com/) | 限定范围通过 | 40 | 参考Cal Sans64与Cal Sans UI16/300、灰paper/白card方向吻合；本次Mobile40。实际完整Placeholder栈与参考替代Poppins/Inter不同，产品Inter/Matter保留局部。 |
| [clickhouse](https://clickhouse.com/) | 限定范围通过 | 51 | Current hero is 96px basier (36px mobile), while reference display-xl is 72px Inter. Body Inter and mono/code families are separately present. |
| [cohere](https://cohere.com/) | 限定范围通过 | 44 | Live hero CohereText 96px, white canvas and dark #17171c CTA align with reference core identity; live also confirms CohereMono technical labels. |
| [cursor](https://www.cursor.com/) | 限定范围通过 | 39 | 参考橙色primary #f54e00，当前下载/开始使用主CTA为rgb(38,37,30)暗墨底、rgb(247,247,244)字；橙色只见演示Build按钮，不能升格全局CTA。 |
| [expo](https://expo.dev/) | 限定范围通过 | 47 | Inter与JetBrains Mono的角色均有真实computed证据；完整fallback不是参考Fira Code，newsletter另有ui-monospace。 |
| [figma](https://www.figma.com/) | 限定范围通过 | 43 | 参考以 Electric Indigo 作为主操作/焦点；当前 hero CTA 是黑底白字，hover 为透明黑混合值，键盘焦点为黑色虚线。 |
| [framer](https://www.framer.com/) | 限定范围通过 | 43 | 当前h1为54/36px；参考display-xxl110、xl85、lg62不对应此次首页主标题。GT Walsheim/Inter族方向一致，但完整Placeholder fallback栈不同。 |
| [hashicorp](https://www.hashicorp.com/) | 限定范围通过 | 44 | 参考和当前主页面均dark，白色nav/Privacy Settings作为独立浅色组件，不混为canvas。 |
| [mintlify](https://www.mintlify.com/) | 限定范围通过 | 39 | 参考Inter主标题与天空渐变，覆盖首页/pricing/docs；此次ArizonaFlare serif 50/40px、白底绿色斜线、Inter18px正文。参考GeistMono未见本次可见主要code glyph。 |
| [mongodb](https://www.mongodb.com/) | 限定范围通过 | 45 | 实时CTA rgb(0,237,100)/深海文字rgb(0,30,43)与模板#00ed64/#001e2b一致；当前4px矩形与参考pill概述不同。 |
| [nvidia](https://www.nvidia.com/) | 限定范围通过 | 34 | Requested NVIDIA.com redirects to NVIDIA.cn. Actual NVIDIA-CN family and green rgb(118,185,0) action are observed; reference typography names NVIDIA-EMEA. Current news tile has16px corners, so reference universal2px surface rule is not supported in sampled CN scope. |
| [ollama](https://ollama.com/) | 限定范围通过 | 33 | 参考SF Pro Rounded 36px居中hero；当前是ui-sans-serif 22px/手机20px靠左，不声称当前页面存在SF Pro Rounded。 |
| [opencode.ai](https://opencode.ai/) | 限定范围通过 | 32 | 当前Canvas rgb(253,252,252)/Heading rgb(32,29,29)与模板#fdfcfc/#201d1d角色一致，仅格式不同。 |
| [posthog](https://posthog.com/) | 限定范围通过 | 42 | 参考IBM Plex Sans/cream blog风格；当前RoundHog、绿色草地OS桌面场景和半透明app窗口、36/30px标题。 |
| [replicate](https://replicate.com/) | 限定范围通过 | 43 | Reference orange primary #ea2804 and cream narrative do not describe the current black Get started CTA on animated pink/orange/yellow hero and white catalogue. Orange might belong to another route or earlier design. |
| [resend](https://resend.com/) | 限定范围通过 | 48 | 参考96px Domaine大标题与Desktop方向吻合；本次Mobile64px，当前主体Inter，ABC Favorit未被当前主要正文实例支持。 |
| [runwayml](https://runwayml.com/) | 限定范围通过 | 37 | Template prose names abcNormal but tokens.json typography.body is Inter; current rendered brand uses abcNormal. Template contains an abnormally long color key made from a prose paragraph. |
| [sentry](https://sentry.io/) | 限定范围通过 | 50 | 参考Sentri-Inspired声明light，并用Sentri Display；本次Marketing Mode为深紫背景，Dammit Sans真实font，白h1和粉色breaks fragment。88pxDesktop与参考匹配，Mobile约50px。 |
| [shopify](https://www.shopify.com/) | 限定范围通过 | 41 | Reference explicitly says Shopifi-Inspired, light theme and NeueHaasGrotesk; actual sampled marketing homepage is dark/video, uses Shopify-Inter, and white filled pill CTA. |
| [slack](https://slack.com/) | 限定范围通过 | 37 | Root redirects to intl/zh-cn. Actual NotoSansSC body/MXiangHeHeiSCProBold 64px desktop and32px mobile heading differ from Salesforce font-based reference. This is locale-specific, not proof of incorrect brand extraction. |
| [spotify](https://www.spotify.com/) | 限定范围通过 | 38 | 参考 Markdown/JSON metadata 为 light，描述却称 dark；当前 Web Player 两视口明确 dark。不是照抄模板 theme。 |
| [supabase](https://supabase.com/) | 限定范围通过 | 42 | 参考Supabaze-Inspired使用Circular和64px主display；本次Manrope h1为46/34px、正文Inter、代码Source Code Pro。 |
| [webflow](https://webflow.com/) | 限定范围通过 | 40 | 参考 display-xxl 的80px/83.2px/-0.8px与桌面 h1一致；实际font fallback 为Arial，参考Inter，不替换实际栈。 |

## 可审计记录

[机器可读汇总](benchmark-v2.1.json) 包含每站 URL、采集时间、采集/编译版本、检查数量、质量警告、模板 SHA、差异及 ZIP/四文件 SHA。原始截图、HTML、冻结 v2、失败记录、补采与纠错草稿保留在本地 `output/design-package-benchmark-v21/`，没有上传网页副本、Cookie、运行时依赖或第三方模板库。

下列证据位置是对应本地 per-site evidence/result 的路径或 JSON 指针，便于核对保存的采样；原始文件不在公开仓库。

### cal

采集：2026-10-14T10:59:05.830Z；最终页面：[https://cal.com/](https://cal.com/)；capture v3，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/cal) 的对照结果：

- partial match：参考Cal Sans64与Cal Sans UI16/300、灰paper/白card方向吻合；本次Mobile40。实际完整Placeholder栈与参考替代Poppins/Inter不同，产品Inter/Matter保留局部。 证据位置：`samples[0/1].elements[2]; selection.json#fontStacks`。
- incorrect blanket restriction in sampled scope：参考Avoid Gradients且primary pill；当前Google/email CTA存在真实子层gradient，文字为子p，透明父anchor不是视觉填色。已保存gradient并未将继承blue/sans用作按钮字。 证据位置：`primary-cta-layer-supplement; files/token.json#/gradient; capture-v21/desktop-top.png`。
- overlay/font detector corrected：旧采集把远处static shadow testimonial Show more当visible overlay；新版未记overlay；textOwner消除父wrapper sans虚假字体遗漏。 证据位置：`capture/evidence-automatic.json; capture-v21/evidence-automatic.json; files/validation.json#quality`。

采样限制：

- Some sampling groups or scroll coverage reached their stated limits; coverage is partial.
- Targeted supplement added CTA actual glyphs/states and visible code/mono text; original automatic evidence saved separately.
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'text', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'actions', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'layout', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'surfaces', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 390, 'height': 844}, 'group': 'text', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 390, 'height': 844}, 'group': 'actions', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 390, 'height': 844}, 'group': 'layout', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 390, 'height': 844}, 'group': 'surfaces', 'family': None}
- {'qualityWarning': 'scroll-coverage-partial', 'viewport': {'width': 390, 'height': 844}, 'group': None, 'family': None}

### clickhouse

采集：2026-10-14T10:47:42.094Z；最终页面：[https://clickhouse.com/](https://clickhouse.com/)；capture v2，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/clickhouse) 的对照结果：

- current-scope-or-version-difference：Current hero is 96px basier (36px mobile), while reference display-xl is 72px Inter. Body Inter and mono/code families are separately present. 证据位置：`capture/evidence.json $.samples[0].elements[2].styles; selection.json hero-desktop`。
- template-unsupported-current-scope：Reference active/disabled yellow CTA colors and control states were not activated; current yellow is preserved as captured lab(), rather than hex-normalized to template values. 证据位置：`draft.md colors/action; capture/evidence.json states`。

采样限制：

- Some sampling groups or scroll coverage reached their stated limits; coverage is partial.
- A visible consent/modal overlay was recorded; no consent was submitted or dismissed.

### cohere

采集：2026-10-14T11:05:58.095Z；最终页面：[https://cohere.com/](https://cohere.com/)；capture v3，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/cohere) 的对照结果：

- aligned：Live hero CohereText 96px, white canvas and dark #17171c CTA align with reference core identity; live also confirms CohereMono technical labels. 证据位置：`selection.json hero-desktop; capture/evidence.json p NORTH PLATFORM`。
- capture-omission：Baseline cookie panel is visually present but not flagged as overlay; auto states select Reject optional, so they do not prove brand Request demo states. 证据位置：`capture/desktop-top.png; capture/mobile-top.png; capture/evidence.json states`。

采样限制：

- Some sampling groups or scroll coverage reached their stated limits; coverage is partial.
- A visible consent/modal overlay was recorded; no consent action was clicked. State sampling uses hover, keyboard focus and Escape cleanup.

### cursor

采集：2026-10-14T10:47:35.093Z；最终页面：[https://cursor.com/](https://cursor.com/)；capture v2，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/cursor) 的对照结果：

- incorrect template role for sampled instance：参考橙色primary #f54e00，当前下载/开始使用主CTA为rgb(38,37,30)暗墨底、rgb(247,247,244)字；橙色只见演示Build按钮，不能升格全局CTA。 证据位置：`states targeted CTA; capture/desktop-top.png`。
- secondary font scope/version difference：参考称每个code用JetBrains Mono；当前真实代码BerkeleyMono及其它demo系统字体，已按代码/产品演示局部角色记录。此次locale中文，26→24.375px h1。 证据位置：`selection.json#fontStacks; samples[0/1].elements[2]`。

采样限制：

- CSS capture is capped at 20000 declarations, prioritized for fonts, named custom properties and core elements; computed values and root variables are recorded separately.
- Some sampling groups or scroll coverage reached their stated limits; coverage is partial.
- Targeted supplement added CTA actual glyphs/states and visible code/mono text; original automatic evidence saved separately.
- {'qualityWarning': 'css-capture-capped', 'viewport': None, 'group': None, 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'text', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'navigation', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'layout', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'footer', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 390, 'height': 844}, 'group': 'navigation', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 390, 'height': 844}, 'group': 'layout', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 390, 'height': 844}, 'group': 'footer', 'family': None}

### expo

采集：2026-10-14T10:59:43.473Z；最终页面：[https://expo.dev/](https://expo.dev/)；capture v3，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/expo) 的对照结果：

- matched-role-with-format-difference：Inter与JetBrains Mono的角色均有真实computed证据；完整fallback不是参考Fira Code，newsletter另有ui-monospace。 证据位置：`samples[0].surfaces[0] background-color; samples[0].elements[20] color; samples[0].elements[2] color; samples[0].elements[96] background-color`。
- scope-version-difference：参考MacBook+iPhone设备组合/天空蓝gradient hero，当前Agentic mobile infrastructure为放射线Expo标志、三栏到单列。 证据位置：`samples[0].surfaces[0] background-color; samples[0].elements[20] color; samples[0].elements[2] color; samples[0].elements[96] background-color`。
- scope-version-difference：当前hero48px/600/52.8px与参考48px/600/1.1基本一致，但tracking为-1.2px而非-1.44px；真实正文500而非概述400。 证据位置：`samples[0].surfaces[0] background-color; samples[0].elements[20] color; samples[0].elements[2] color; samples[0].elements[96] background-color`。
- template-not-supported-in-current-scope：额外状态、code完整表面和广泛spacing角色不在本页当前采样范围，不因模板token更多而制造。 证据位置：`samples[0].surfaces[0] background-color; samples[0].elements[20] color; samples[0].elements[2] color; samples[0].elements[96] background-color`。

采样限制：

- Some sampling groups or scroll coverage reached their stated limits; coverage is partial.
- A visible consent/modal overlay was recorded; no consent was submitted or dismissed.
- JetBrains Mono 与系统 ui-monospace 是两个真实局部角色，不漏为只 Inter。
- 客户图标/图形内部颜色不推断成通用 palette。
- 未点击登录、联系团队、同意 Cookie 或提交 newsletter。

### figma

采集：2026-10-14T10:59:15.211Z；最终页面：[https://www.figma.com/](https://www.figma.com/)；capture v3，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/figma) 的对照结果：

- template-not-supported-in-current-scope：参考以 Electric Indigo 作为主操作/焦点；当前 hero CTA 是黑底白字，hover 为透明黑混合值，键盘焦点为黑色虚线。 证据位置：`samples[0].elements[79] background-color; samples[0].elements[135] color; states[1].hover background-color; samples[0].elements[79] padding-right`。
- scope-version-difference：两者包含 figmaSans/figmaMono，但实时完整栈是 SF Pro Display/SF Mono 等 fallback，而模板用 Inter/ui-monospace。未拷贝未观测 fallback。 证据位置：`samples[0].surfaces[0] background-color; samples[0].elements[33] color; samples[0].elements[2] color; samples[0].elements[79] background-color`。
- scope-version-difference：参考 display 72px 与当前 h1 56px/手机36px、字重400不同；真实CTA内span桌面30px而anchor继承16px，新版提取取字形实例。 证据位置：`samples[0].surfaces[0] background-color; samples[0].elements[33] color; samples[0].elements[2] color; samples[0].elements[79] background-color`。
- template-not-supported-in-current-scope：模板指定 indigo spotlight/16px floating hero shadow；当前主视觉是动态素材拼贴，不能将素材里颜色和阴影全升级为页面组件。 证据位置：`samples[0].surfaces[0] background-color; samples[0].elements[33] color; samples[0].elements[2] color; samples[0].elements[79] background-color`。

采样限制：

- Some sampling groups or scroll coverage reached their stated limits; coverage is partial.
- A visible consent/modal overlay was recorded; no consent was submitted or dismissed.
- 动态示例素材颜色不自动变成稳定品牌主色。
- CTA 的实际文字 span 为桌面 30px；其 anchor 继承 16px 不是可见文字字号。
- 330/340 等字重为可变字体的真实值，未规整成猜测的 400。

### framer

采集：2026-10-14T10:59:05.136Z；最终页面：[https://www.framer.com/](https://www.framer.com/)；capture v3，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/framer) 的对照结果：

- scope/version difference：当前h1为54/36px；参考display-xxl110、xl85、lg62不对应此次首页主标题。GT Walsheim/Inter族方向一致，但完整Placeholder fallback栈不同。 证据位置：`samples[0/1].elements[2].styles.font-size; selection.json#fontStacks`。
- extraction defect fixed：冻结v2大多数anchor是未使用sans12与蓝色；新v2.1采真正子p glyph并通过textOwner=false排除虚假字体遗漏。CTA白填黑字与参考一致。 证据位置：`capture/evidence-automatic.json; capture-v21/evidence-automatic.json; files/validation.json#quality`。
- template exporter fidelity：参考每个font block Substitute均Inter，会改变GT Walsheim原排版；本包完整实际栈。 证据位置：`files/variables.css; selection.json#fontStacks`。

采样限制：

- CSS capture is capped at 20000 declarations, prioritized for fonts, named custom properties and core elements; computed values and root variables are recorded separately.
- Some sampling groups or scroll coverage reached their stated limits; coverage is partial.
- A visible consent/modal overlay was recorded; no consent was submitted or dismissed.
- Targeted supplement added CTA actual glyphs/states and visible code/mono text; original automatic evidence saved separately.
- {'qualityWarning': 'css-capture-capped', 'viewport': None, 'group': None, 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'text', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'actions', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'layout', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'footer', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'text-fragments', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'surfaces', 'family': None}
- {'qualityWarning': 'visible-overlay', 'viewport': {'width': 1440, 'height': 1000}, 'group': None, 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 390, 'height': 844}, 'group': 'text', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 390, 'height': 844}, 'group': 'layout', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 390, 'height': 844}, 'group': 'footer', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 390, 'height': 844}, 'group': 'text-fragments', 'family': None}
- {'qualityWarning': 'visible-overlay', 'viewport': {'width': 390, 'height': 844}, 'group': None, 'family': None}

### hashicorp

采集：2026-10-14T11:00:17.675Z；最终页面：[https://www.hashicorp.com/zh](https://www.hashicorp.com/zh)；capture v3，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/hashicorp) 的对照结果：

- matched-role-with-format-difference：参考和当前主页面均dark，白色nav/Privacy Settings作为独立浅色组件，不混为canvas。 证据位置：`samples[0].surfaces[1] background-color; samples[0].elements[30] color; samples[0].elements[2] color; samples[0].elements[90] background-color`。
- scope-version-difference：参考hashicorpSans80px/700/-2.5px；当前hashed HashiCorpSans 82px/600/normal，手机42px。不同捕获/部署版本，实时值保留。 证据位置：`samples[0].elements[2] font-size`。
- scope-version-difference：当前正文和nav为system-ui、主标题HashiCorpSans、表单Arial；参考只概括同family正文500，不覆盖这些当前角色。 证据位置：`samples[0].elements[30] font-size`。
- template-not-supported-in-current-scope：Terraform/Vault等产品identity色可能存在更广路线，不把模板完整产品色补成当前首页所有语义状态。 证据位置：`samples[0].surfaces[1] background-color; samples[0].elements[30] color; samples[0].elements[2] color; samples[0].elements[90] background-color`。

采样限制：

- Some sampling groups or scroll coverage reached their stated limits; coverage is partial.
- A visible consent/modal overlay was recorded; no consent was submitted or dismissed.
- 自动转 /zh，但主体仍英文；不能仅凭路径声称翻译完成。
- 基线截图在焦点采样后残留 Solutions 菜单；新版截图需检查 Escape 清理是否生效。
- 浅色 header 与隐私面板是独立组件，主页面仍 dark；不把二者混名。

### mintlify

采集：2026-10-14T10:48:33.338Z；最终页面：[https://www.mintlify.com/](https://www.mintlify.com/)；capture v2，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/mintlify) 的对照结果：

- scope/version difference：参考Inter主标题与天空渐变，覆盖首页/pricing/docs；此次ArizonaFlare serif 50/40px、白底绿色斜线、Inter18px正文。参考GeistMono未见本次可见主要code glyph。 证据位置：`samples[0/1].elements[2]; selection.json#fontStacks; capture/desktop-top.png`。
- state coverage limitation resolved by supplement：自动helper有selector identity changed并选择动态Agent traffic；已定向补Get started主CTA hover及keyboard focus，没提交表单。 证据位置：`states selector [data-benchmark-target=layered]; capture/evidence-automatic.json`。

采样限制：

- Some sampling groups or scroll coverage reached their stated limits; coverage is partial.
- Targeted supplement added CTA actual glyphs/states and visible code/mono text; original automatic evidence saved separately.
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'text', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'footer', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 390, 'height': 844}, 'group': 'text', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 390, 'height': 844}, 'group': 'footer', 'family': None}
- {'qualityWarning': 'scroll-coverage-partial', 'viewport': {'width': 390, 'height': 844}, 'group': None, 'family': None}
- {'qualityWarning': 'some-state-targets-unavailable', 'viewport': None, 'group': None, 'family': None}

### mongodb

采集：2026-10-14T10:59:41.001Z；最终页面：[https://www.mongodb.com/zh-cn](https://www.mongodb.com/zh-cn)；capture v3，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/mongodb) 的对照结果：

- matched-role-with-format-difference：实时CTA rgb(0,237,100)/深海文字rgb(0,30,43)与模板#00ed64/#001e2b一致；当前4px矩形与参考pill概述不同。 证据位置：`samples[0].elements[70] background-color; samples[0].elements[70] color; samples[0].elements[70] padding-right; samples[0].elements[70] padding-top`。
- scope-version-difference：参考Euclid Circular A/Source Code Pro，当前正文Sohne、标题Sohne Condensed、标签Sohne Mono与其它局部栈。模板覆盖多route/历史体系，当前页面不支持用旧font覆写。 证据位置：`samples[0].surfaces[4] background-color; samples[0].elements[20] color; samples[0].elements[2] color; samples[0].elements[70] background-color`。
- scope-version-difference：当前中文hero64px/700/72px、手机40px/48px；参考72px/500/1.1，不等同同locale/viewport/route实例。 证据位置：`samples[0].elements[2] font-size`。
- template-not-supported-in-current-scope：右侧代码演示媒体不证明Source Code Pro DOM语法族已渲染；Sohne Mono仅对真实标签文字实例声明。 证据位置：`samples[0].surfaces[4] background-color; samples[0].elements[20] color; samples[0].elements[2] color; samples[0].elements[70] background-color`。

采样限制：

- Some sampling groups or scroll coverage reached their stated limits; coverage is partial.
- Targeted primary CTA state supplement used an anonymous fresh render; recorded separately from initial default screenshots.
- 自动转 zh-cn；英文模板与当前字形和语言范围不同。
- announcement 的父链接同为绿色文字/底色，实际白色文字在内 span；不能取无效继承值。
- 文档链接实际内 span 为深海色，不取父链接默认蓝色。
- 代码演示需区分媒体与 DOM，当前没有完整逐语法 token。

### nvidia

采集：2026-10-14T11:06:32.312Z；最终页面：[https://www.nvidia.cn/](https://www.nvidia.cn/)；capture v3，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/nvidia) 的对照结果：

- locale/scope-difference：Requested NVIDIA.com redirects to NVIDIA.cn. Actual NVIDIA-CN family and green rgb(118,185,0) action are observed; reference typography names NVIDIA-EMEA. Current news tile has16px corners, so reference universal2px surface rule is not supported in sampled CN scope. 证据位置：`selection.json body/action; capture-v21/evidence.json samples[0].surfaces[6]; capture-v21-final/evidence-enriched.json finalUrl`。
- sampling-limit：Version3 desktop computed snapshot was empty even though its later screenshot rendered the hero; targeted desktop supplement was still loading. Package combines real version2 desktop snapshot with real version3 mobile and explicit provenance. It is not pure version3 automatic success. 证据位置：`capture-v21-final/evidence-enriched.json samples[0],samples[2],samples[4].provenance; files/validation.json quality missing-core-capture`。
- corrected-extraction-role：Final semantic review separated black desktop Windows/light hero and white mobile keynote/dark hero tokens, and replaced16px accessibility skip-link typography with14px/37px desktop utility navigation for 驱动/支持. No new website capture or template values used. 证据位置：`capture-v21-final/evidence-enriched.json samples[4].elements[3].styles.color; samples[1].elements[2].styles.color; samples[4].elements[74/75].styles; selection.json heroAppearanceBindings`。

采样限制：

- A normal document navigation interrupted a read; retried that read once after DOMContentLoaded. No URL was re-requested.
- Overlay visibility changed during hover/focus/Escape cleanup at 1440px; before-state observations are preserved in overlaysBeforeStates.
- CSS capture is capped at 20000 declarations, prioritized for fonts, named custom properties and core elements; computed values and root variables are recorded separately.
- Some sampling groups or scroll coverage reached their stated limits; coverage is partial.
- Desktop captureVersion3 computed sample was empty; this package supplements it with the separately preserved captureVersion2 official nvidia.cn desktop snapshot. Mobile is captureVersion3. This is a qualified multi-capture reference, not proof of complete version3 automatic desktop extraction.

### ollama

采集：2026-10-14T10:59:52.272Z；最终页面：[https://ollama.com/](https://ollama.com/)；capture v3，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/ollama) 的对照结果：

- scope-version-difference：参考SF Pro Rounded 36px居中hero；当前是ui-sans-serif 22px/手机20px靠左，不声称当前页面存在SF Pro Rounded。 证据位置：`samples[0].elements[2] font-size`。
- template-not-supported-in-current-scope：参考inline install snippet、pricing/FAQ薄边框卡片及mono，当前介绍页只有统计和机构logo矩阵；没有这些可见组件。 证据位置：`samples[0].surfaces[0] background-color; samples[0].elements[3] color; samples[0].elements[2] color; samples[0].elements[20] background-color`。
- matched-role-with-format-difference：两者白底、黑色圆角胶囊大体一致；当前CTA默认rgb(23,23,23)、hover黑，不硬改默认为模板pure black。 证据位置：`samples[0].elements[20] background-color; samples[0].elements[20] color; states[1].hover background-color; samples[0].elements[20] padding-right`。

采样限制：

- 仅当前短介绍首页，不覆盖 Models/Docs/Pricing。
- 576px 是说明段落 max-width，不能叫整站容器宽。
- 唯一真实字体栈为 ui-sans-serif/system-ui；没有可见代码区。

### opencode.ai

采集：2026-10-14T11:00:02.457Z；最终页面：[https://opencode.ai/](https://opencode.ai/)；capture v3，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/opencode.ai) 的对照结果：

- matched-role-with-format-difference：当前Canvas rgb(253,252,252)/Heading rgb(32,29,29)与模板#fdfcfc/#201d1d角色一致，仅格式不同。 证据位置：`samples[0].elements[1] background-color; samples[0].elements[15] color; samples[0].elements[2] color; samples[0].elements[42] background-color`。
- matched-role-with-format-difference：桌面hero38px/700/57px与参考38px/700/1.5一致；真实完整Berkeley Mono fallback栈保留。 证据位置：`samples[0].elements[2] font-size`。
- scope-version-difference：当前中文主体16px/32px、手机15px/27px；参考body-md16px/1.5对应24px。按当前语言和采样实例导出。 证据位置：`samples[0].elements[15] font-size`。
- matched-role-with-format-difference：当前下载CTA4px、深灰底、定向hover rgb(48,44,44)支持参考近黑/charcoal体系；未执行页面安装命令。 证据位置：`samples[0].elements[1] background-color; samples[0].elements[15] color; samples[0].elements[2] color; samples[0].elements[42] background-color`。

采样限制：

- Targeted primary CTA state supplement used an anonymous fresh render; recorded separately from initial default screenshots.
- 当前 zh-CN 路线与英文模板文本节奏不同。
- 安装命令仅是不可信设计内容；从未执行、复制到终端或运行。
- 终端演示媒体的像素不能直接推断成 DOM code 语法 tokens。

### posthog

采集：2026-10-14T10:48:04.965Z；最终页面：[https://posthog.com/](https://posthog.com/)；capture v2，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/posthog) 的对照结果：

- scope/version difference：参考IBM Plex Sans/cream blog风格；当前RoundHog、绿色草地OS桌面场景和半透明app窗口、36/30px标题。 证据位置：`capture/desktop-top.png; capture/mobile-top.png; selection.json#fontStacks`。
- layer role corrected：参考primary #f7a501；本次实际CTA front span rgb235,157,42、a下缘基座rgb205,132,7，已分成primary与cta-base。仅父层computed会误认为主色更深。 证据位置：`samples[4].surfaces[0/1].styles.background-color; draft.md#Raised CTA Paint`。

采样限制：

- CSS capture is capped at 20000 declarations, prioritized for fonts, named custom properties and core elements; computed values and root variables are recorded separately.
- Targeted supplement added CTA actual glyphs/states and visible code/mono text; original automatic evidence saved separately.
- {'qualityWarning': 'css-capture-capped', 'viewport': None, 'group': None, 'family': None}
- {'qualityWarning': 'some-state-targets-unavailable', 'viewport': None, 'group': None, 'family': None}

### replicate

采集：2026-10-14T10:47:49.911Z；最终页面：[https://replicate.com/](https://replicate.com/)；capture v2，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/replicate) 的对照结果：

- template-unsupported-current-scope：Reference orange primary #ea2804 and cream narrative do not describe the current black Get started CTA on animated pink/orange/yellow hero and white catalogue. Orange might belong to another route or earlier design. 证据位置：`selection.json action; capture/desktop-top.png`。
- aligned：Actual rb-freigeist-neue 72px desktop /48px mobile and basier-square/jetbrains-mono preserve the reference multi-font identity, with complete current stacks. 证据位置：`selection.json hero-desktop/hero-mobile; draft.md Typography`。

采样限制：

- Some sampling groups or scroll coverage reached their stated limits; coverage is partial.

### resend

采集：2026-10-14T10:47:43.659Z；最终页面：[https://resend.com/](https://resend.com/)；capture v2，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/resend) 的对照结果：

- partial match and broader reference：参考96px Domaine大标题与Desktop方向吻合；本次Mobile64px，当前主体Inter，ABC Favorit未被当前主要正文实例支持。 证据位置：`samples[0/1].elements[2]; samples[0].elements[36]; selection.json#fontStacks`。
- heading paint extraction corrected：H1 actualpaint是.effect-font-gradient的white→half-alpha gradient，clip:text与text-fill透明，不能把computed继承rgb240当实际平色。已新增gradient-heading。 证据位置：`samples[0].elements[2].styles.background-image; source.declarations[12234..12244]`。

采样限制：

- CSS capture is capped at 20000 declarations, prioritized for fonts, named custom properties and core elements; computed values and root variables are recorded separately.
- Some sampling groups or scroll coverage reached their stated limits; coverage is partial.
- Targeted supplement added CTA actual glyphs/states and visible code/mono text; original automatic evidence saved separately.
- {'qualityWarning': 'css-capture-capped', 'viewport': None, 'group': None, 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'text', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'actions', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'footer', 'family': None}
- {'qualityWarning': 'scroll-coverage-partial', 'viewport': {'width': 1440, 'height': 1000}, 'group': None, 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 390, 'height': 844}, 'group': 'text', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 390, 'height': 844}, 'group': 'actions', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 390, 'height': 844}, 'group': 'footer', 'family': None}
- {'qualityWarning': 'scroll-coverage-partial', 'viewport': {'width': 390, 'height': 844}, 'group': None, 'family': None}

### runwayml

采集：2026-10-14T11:06:15.507Z；最终页面：[https://runway.com/](https://runway.com/)；capture v3，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/runwayml) 的对照结果：

- reference-internal-inconsistency：Template prose names abcNormal but tokens.json typography.body is Inter; current rendered brand uses abcNormal. Template contains an abnormally long color key made from a prose paragraph. 证据位置：`selection.json body.font-family; capture/supplement-top-1440.png`。
- capture-state-contamination：Baseline hover Creative leaves a menu covering desktop hero; Cookiebot late panel covers mobile. Supplemental Escape/default viewport demonstrates actual video hero without accepting consent. 证据位置：`capture/desktop-top.png; capture/mobile-top.png; capture/supplement-top-1440.png; capture/supplement-top-390.png`。

采样限制：

- Some sampling groups or scroll coverage reached their stated limits; coverage is partial.
- A visible consent/modal overlay was recorded; no consent action was clicked. State sampling uses hover, keyboard focus and Escape cleanup.

### sentry

采集：2026-10-14T10:48:17.729Z；最终页面：[https://sentry.io/welcome/](https://sentry.io/welcome/)；capture v2，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/sentry) 的对照结果：

- scope/version difference：参考Sentri-Inspired声明light，并用Sentri Display；本次Marketing Mode为深紫背景，Dammit Sans真实font，白h1和粉色breaks fragment。88pxDesktop与参考匹配，Mobile约50px。 证据位置：`capture/desktop-top.png; samples[0/1].elements[2]; selection.json#fontStacks`。
- incorrect template role for sampled instance：参考primary暗色底白字；当前GET STARTED为白色paint layer、深紫字；紫色MCP公告CTA和主注册按钮独立，不能将公告hover代替注册hover。 证据位置：`primary-cta-layer-supplement; states targeted GET STARTED`。

采样限制：

- Some sampling groups or scroll coverage reached their stated limits; coverage is partial.
- Targeted supplement added CTA actual glyphs/states and visible code/mono text; original automatic evidence saved separately.
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'text', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'navigation', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'actions', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'layout', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'footer', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 390, 'height': 844}, 'group': 'navigation', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 390, 'height': 844}, 'group': 'layout', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 390, 'height': 844}, 'group': 'footer', 'family': None}

### shopify

采集：2026-10-14T11:06:34.631Z；最终页面：[https://www.shopify.com/](https://www.shopify.com/)；capture v3，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/shopify) 的对照结果：

- template-inspired-scope-difference：Reference explicitly says Shopifi-Inspired, light theme and NeueHaasGrotesk; actual sampled marketing homepage is dark/video, uses Shopify-Inter, and white filled pill CTA. 证据位置：`selection.json hero-desktop/action; capture/supplement-top-1440.png`。
- capture-omission：Baseline visually shows main hero but headings sampling misses it during animated transition; supplemental capture observes actual h1 96px/56px. 证据位置：`capture/evidence.json samples headings; capture/evidence-enriched.json supplemental elements; selection.json hero-desktop`。

采样限制：

- Some sampling groups or scroll coverage reached their stated limits; coverage is partial.

### slack

采集：2026-10-14T10:48:36.763Z；最终页面：[https://slack.com/intl/zh-cn/](https://slack.com/intl/zh-cn/)；capture v2，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/slack) 的对照结果：

- locale-scope-difference：Root redirects to intl/zh-cn. Actual NotoSansSC body/MXiangHeHeiSCProBold 64px desktop and32px mobile heading differ from Salesforce font-based reference. This is locale-specific, not proof of incorrect brand extraction. 证据位置：`capture/evidence.json finalUrl; selection.json body/hero-desktop/hero-mobile`。
- component-role-difference：Hero CTA is rgb(113,4,145) while nav CTA is rgb(115,3,148); reference aubergine #611f69 is broader than this action role, while dark-band #481a54 matches observed AI section. 证据位置：`selection.json action; capture/evidence.json $.samples[0].elements[70] and surfaces[4]`。

采样限制：

- CSS capture is capped at 20000 declarations, prioritized for fonts, named custom properties and core elements; computed values and root variables are recorded separately.
- Some sampling groups or scroll coverage reached their stated limits; coverage is partial.
- A visible consent/modal overlay was recorded; no consent was submitted or dismissed.

### spotify

采集：2026-10-14T10:59:07.399Z；最终页面：[https://open.spotify.com/](https://open.spotify.com/)；capture v3，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/spotify) 的对照结果：

- template-not-supported-in-current-scope：参考 Markdown/JSON metadata 为 light，描述却称 dark；当前 Web Player 两视口明确 dark。不是照抄模板 theme。 证据位置：`samples[0].surfaces[0] background-color; samples[0].elements[16] color; samples[0].elements[3] color; samples[0].elements[91] background-color`。
- scope-version-difference：实时正文 SpotifyMixUI，分区标题 SpotifyMixUITitle；参考只列 SpotifyMixUI。长中文/Emoji fallback 栈按实时 computed 值保留。 证据位置：`samples[0].surfaces[0] background-color; samples[0].elements[16] color; samples[0].elements[3] color; samples[0].elements[91] background-color`。
- template-not-supported-in-current-scope：参考 tokens.json typography.button.fontSize 为 0.14px；当前可见操作为 14px 或 16px。该值不支持当前采样操作，不修成猜测值。 证据位置：`samples[0].surfaces[0] background-color; samples[0].elements[16] color; samples[0].elements[3] color; samples[0].elements[91] background-color`。
- scope-version-difference：参考 Spotify Green/status/accent 色可能属于播放或其它状态；当前没有操作播放，导出实际黑灰/白胶囊及注册横幅渐变。 证据位置：`samples[0].surfaces[0] background-color; samples[0].elements[16] color; samples[0].elements[3] color; samples[0].elements[91] background-color`。

采样限制：

- CSS capture is capped at 20000 declarations, prioritized for fonts, named custom properties and core elements; computed values and root variables are recorded separately.
- Cross-origin CSS capture capped at 12 observed stylesheets.
- Some sampling groups or scroll coverage reached their stated limits; coverage is partial.
- www.spotify.com 自动转 open.spotify.com，范围是 Web Player 而不是营销首页。
- 必须取 CTA span 的黑字白底；button 继承灰色/透明值不能作可见 CTA 角色。
- 手机视口裁切属于源站结果；没有播放、登录、创建歌单或注册。

### supabase

采集：2026-10-14T10:47:11.139Z；最终页面：[https://supabase.com/](https://supabase.com/)；capture v2，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/supabase) 的对照结果：

- scope/version difference：参考Supabaze-Inspired使用Circular和64px主display；本次Manrope h1为46/34px、正文Inter、代码Source Code Pro。 证据位置：`samples[0].elements[2].styles.font-family; samples[1].elements[2].styles.font-size`。
- incorrect template role for sampled instance：参考primary #3ecf8e；当前实际CTA是oklch(0.525 0.12 157.5)，绿色logo或其它声明出现不证明其为此CTA填充。 证据位置：`states targeted Start your project baseline background-color`。

采样限制：

- Some sampling groups or scroll coverage reached their stated limits; coverage is partial.
- Targeted supplement added CTA actual glyphs/states and visible code/mono text; original automatic evidence saved separately.
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'text', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'actions', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 1440, 'height': 1000}, 'group': 'footer', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 390, 'height': 844}, 'group': 'text', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 390, 'height': 844}, 'group': 'actions', 'family': None}
- {'qualityWarning': 'sampling-group-capped', 'viewport': {'width': 390, 'height': 844}, 'group': 'footer', 'family': None}

### webflow

采集：2026-10-14T11:00:21.016Z；最终页面：[https://webflow.com/](https://webflow.com/)；capture v3，compiler 2.1.0。

[固定版本模板](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands/webflow) 的对照结果：

- matched-role-with-format-difference：参考 display-xxl 的80px/83.2px/-0.8px与桌面 h1一致；实际font fallback 为Arial，参考Inter，不替换实际栈。 证据位置：`samples[0].elements[2] font-size`。
- scope-version-difference：参考主色primary=#080808作为概括；当前实际Get started为rgb(20,110,245)，定向hover为rgb(0,85,212)，按CTA角色而非概括主色导出。 证据位置：`samples[0].elements[101] background-color; samples[0].elements[101] color; states[3].hover background-color; samples[0].elements[101] padding-right`。
- template-not-supported-in-current-scope：参考 WFVisualSans-Mono/Inconsolata 未在当前可见文字中形成真实mono字体角色；Google Inconsolata CSS请求超时属于访问限制，不据模板补造。 证据位置：`samples[0].surfaces[0] background-color; samples[0].elements[26] color; samples[0].elements[2] color; samples[0].elements[101] background-color`。
- scope-version-difference：当前agentic平台hero与产品示例、公告和中文Cookie面板；参考自称 Inspired，不能用其广泛产品色直接判实时提取错误。 证据位置：`samples[0].surfaces[0] background-color; samples[0].elements[26] color; samples[0].elements[2] color; samples[0].elements[101] background-color`。

采样限制：

- Some sampling groups or scroll coverage reached their stated limits; coverage is partial.
- Targeted primary CTA state supplement used an anonymous fresh render; recorded separately from initial default screenshots.
- 主 CTA 需独立绑定 Get started，自动状态候选中的首个蓝色 action 是公告链接。
- 部分 hover color 为 transition 中间态，只记录观察值，不把瞬时值定义为稳态 palette。
- 当前页采用 WF Visual Sans Variable，不从模板推断 Inter/mono。
- 新版有界DOM检查记录 body 后方 fixed #transcend-consent-manager opaque边界（opaque-host-check.json）；此metadata不证明面板可见/closed shadow，也不表示已读内部CSS。截图可见Cookie面板，内部CSS仍未采。

