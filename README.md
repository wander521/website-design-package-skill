# Website Design Package Skill

把一个网页网址交给 Codex，提取有证据支持的设计系统，生成经过校验的四文件 ZIP；也可以检查生成的前端是否符合 design.md。

```text
用 $website-design-package 提取 https://目标网站
```

基于 [RICOUI DESIGN](https://github.com/ricocc/ricoui-design-md) 的 Markdown 解析与导出流程，当前版本 **2.3.0**。

## 输出

每个设计 ZIP 恰好包含：

| 文件 | 用途 |
|---|---|
| `design.md` | 可读设计规范：颜色、字体、字阶、间距、形状、组件、布局与提取范围 |
| `token.json` | RICOUI-compatible、DTCG-style 设计 token |
| `variables.css` | 普通 CSS 自定义变量 |
| `theme.css` | Tailwind CSS v4 的 `@theme` 定义及必要别名 |

`design.md` 是唯一数据源。JSON 和两份 CSS 由同一次解析生成；修正时修改 Markdown，再重新编译和校验。

## 安装到 Codex

将这个仓库克隆到个人 skills 目录，并使用 skill 名称作为目录名：

```sh
git clone https://github.com/wander521/website-design-package-skill.git \
  "$HOME/.codex/skills/website-design-package"
```

如果设置了自定义 `CODEX_HOME`，使用对应的 `<CODEX_HOME>/skills/website-design-package`。已有同名 skill 时，先保留你的本地修改，再更新仓库。

在 Codex 中明确调用 `$website-design-package`，并提供目标 URL。入口是 [SKILL.md](SKILL.md)，界面元数据在 [agents/openai.yaml](agents/openai.yaml)。

## 运行环境

- Node.js **22 或更新版本**。
- 采集和浏览器校验需要 **Playwright** 与 Chromium，或已安装的 Google Chrome。
- Markdown 解析器与导出模块已随 skill 提供，不需要安装整个 RICOUI 网站。
- 可以使用 Codex 已有的工作区运行时；`--playwright <node_modules目录>` 指定已有 Playwright。

先确认 `node --version` 为 22 或更新版本；如果使用 nvm，可运行 `nvm install 22 && nvm use 22`。在仓库目录安装独立运行所需依赖：

```sh
npm ci
npx playwright install chromium
```

本项目没有额外 AI API Key 配置。**网页分析和 `draft.md` 编写由调用 skill 的 Codex 完成**；脚本负责采集、确定性编译、浏览器验证和打包。只运行采集命令不会自动生成完整设计规范。

## 使用示例

```text
用 $website-design-package 提取 https://linear.app/，生成设计规范和 ZIP。
```

```text
用 $website-design-package 提取这个网站的深色外观，比较桌面和手机，并保留提取限制。
```

```text
用 $website-design-package 提取这个网址，再与我提供的设计模板比较，检查是否遗漏字体或错误归因。
```

## 提取与验证流程

1. 采集 1440px 桌面和 390px 手机视图、实际计算样式、命名变量、字体、文字片段与页面结构。
2. 读取可访问 CSS 和实际观察到的跨域样式表，记录采集上限与失败信息。
3. 检查主动作的默认、hover、键盘焦点；保留可见弹窗和覆盖范围。
4. Codex 根据证据编写符合 RICOUI 表格语法的 Markdown，并核对实际组件角色。
5. 编译四个文件，进行浏览器 CSS 校验，再核对 SHA-256 和 ZIP 内容。

编译器会拦截缺少证据、非法/重复 token、孤立表格行、循环/未解析引用和部分跨属性误用。来源记录、字体清单与截图用于进一步判断语义：**CSS 有效并不等于设计角色准确**。

## 前端还原度验收（v2.3）

直接使用同一个 skill，提供 **design.md / 设计包 + 已生成前端的运行地址**：

```text
用 $website-design-package 检查这个前端 http://localhost:3000 是否符合 ./design.md。
重点检查桌面、手机、弹窗、下拉和其他控件，给出偏差和修正建议。
```

```text
用 $website-design-package 验收前端 http://localhost:3000 对原站 https://参考网站 的还原度。
设计规范是 ./design.md，请对照同尺寸、同主题的截图和控件展开状态。
```

**新页面的设计一致性**与**原页面复刻**分别检查。仅有 design.md 时能验收其中定义的规范；要判断原页面的构图、图片、换行和布局还原，还需要原站或对应截图。

Codex 阅读规范并检查目标页面后，会建立“元素—属性—视口—状态”的映射，运行测量并复核截图。它检查实际绘制样式与实际使用的字体，不会因为导入了正确变量就判定通过。弹窗和下拉需同时检查触发器与展开层；其余控件按 19 类清单记录状态与原生边界。

输出独立的 `audit.md` 审阅结论、`fidelity.json` / `fidelity.md` 原始测量及桌面/手机截图，不改变原来的四文件 ZIP。报告区分符合、偏差、受阻/未检查和参考未定义；列出预期值、实际值、位置、状态、影响与修正建议。**不把几个 CSS 检查换算成“整体还原度 95%”**。

测量脚本也可以单独运行；映射方案由 Codex 根据当前文档与页面生成，脚本不替代视觉判断：

```sh
node scripts/fidelity.mjs ./design.md http://localhost:3000 ./plan.json ./output/fidelity
```

输出目录必须为空。0 表示映射项通过但仍需视觉复核，2 表示存在偏差，3 表示检查不完整，1 表示输入或运行失败。依赖选择仍支持 `--playwright`。相对单位、上下文颜色及复杂图像等保留浏览器复核范围，不伪造期望值。详细输入、映射示例与验收流程见 [还原度验收规则](references/fidelity.md)，验证记录见 [v2.3 验证报告](docs/fidelity-v2.3.md)。

## 控件覆盖与新前端实现

v2.2 增加 **19 类控件**的清单、状态和来源范围检查：弹窗、下拉、输入框、复选/单选/开关、按钮、日期时间、颜色、文件、滑块、Tabs、折叠、Tooltip、反馈/错误、进度、表格、分页和导航。

每份用于前端参考的新包必须在 Components 中写明控件覆盖与 `Frontend Implementation` 约定：原站观测、原生边界、未观测、受阻、或基于原语派生。不能为了补齐规范伪造原站组件。弹窗/下拉需检查展开状态，其他控件需说明已覆盖与未覆盖的状态。

组件说明与覆盖清单现在同时保留在 `design.md` 和 `token.json.$extensions['website-design-package']`。**CSS 文件仍只是 token，不会自动实现组件**。新前端需使用现有可访问组件基础并应用主题；业务弹窗不能悄悄改用 `alert/confirm/prompt`，只给 select 加 `appearance:none` 也不等于展开项已统一样式。可完整样式化的 HTML `<dialog>`、原生表单语义和系统文件窗口/手机键盘应正确区分。

先确认可逆且不提交数据的精确触发器，再定向采样：

```sh
node scripts/browser.mjs inspect https://目标网站 output/site/popup \
  --trigger '#已核对的触发器'
```

该命令在桌面/手机采集关闭、打开、菜单项悬停与 Escape 后的状态，并记录关闭/焦点恢复结果。它不选择选项或提交表单，不自动遍历点击页面按钮；原生 select/datalist 只记录边界。模糊控件、完整键盘行为与视口边缘仍需浏览器补验。

详细规则见 [控件提取与实现约定](references/controls.md)，本次审计与真实示例验证见 [v2.2 控件报告](docs/controls-v2.2.md)。历史 23 份 v2.1 包没有被偷偷修改或重新标为完整组件库。

## 手动执行脚本

以下命令从仓库根目录运行：

```sh
node scripts/browser.mjs capture https://目标网站 output/site/capture
node scripts/summarize.mjs output/site/capture/evidence.json
```

检查截图与证据，然后由 Codex 按 [格式说明](references/format.md) 写入 `output/site/draft.md`，再执行：

```sh
node scripts/build.mjs compile \
  output/site/draft.md output/site/capture/evidence.json output/site/files

node scripts/browser.mjs verify output/site/files

node scripts/build.mjs pack output/site/files output/site/design-package.zip
```

需要读取已有 Playwright 时，在 `capture` 或 `verify` 命令末尾增加：

```text
--playwright /absolute/path/to/node_modules
```

显式采集深色偏好时，为 `capture` 增加 `--color-scheme dark`；仍需确认网站实际呈现的主题。

`validation.json`、HTML、截图和工作证据保留在本地工作目录，不进入设计 ZIP。如果浏览器启动被执行环境限制，应使用该环境的授权机制；不要跳过浏览器验证或把失败采样标为成功。缺少 Playwright 时可使用 [浏览器工具替代流程](references/browser-evidence.md)。

## 测试与实测

```sh
npm run test:unit     # 28 项编译、证据、引用、导出和打包测试
npm run test:browser  # 23 项浏览器、采集、控件与还原度测试
npm test             # 全部 51 项测试
```

已有运行时也可通过 `DESIGN_TEST_PLAYWRIGHT=<node_modules目录>` 指定测试依赖。测试使用临时目录和本地 HTTP 页面，不依赖实时品牌网站。

2026-10-14 的 v2 实测覆盖 **Apple、Notion、Linear、Raycast、Stripe、Vercel**：六份新版包合计 **311 项 CSS 校验通过**，新旧共 12 份 ZIP 的四文件集合、CRC 和 SHA-256 核验通过。

这次对照修复了跨域 CSS 遗漏、动画截图时序、次要字体漏选、中文变量冲突、孤立 token 行、hover/focus 混合和深层 DOM 元素误选等问题。详细范围与限制见 [验证说明](docs/validation.md)。

v2.1.0 新增 **24 个真实网站测试**：**23 份限定范围设计包通过**，合计 **952 项 CSS 检查**；Airbnb 主体加载不完整，不计为成功。每份成功 ZIP 都核验了恰好四文件、CRC 和 SHA-256。已有六站保持为历史结果，不重复计数。

本轮修复了 CTA/nav 内部字形、非 h1 主标题、Cookie 面板误选/漏报、菜单残留、导航中断、字体截图超时、空视口采样及 var() 类型验证。多次捕获与不可读组件均保留范围说明。详见 [v2.1 验证报告](docs/validation-v2.1.md)、[机器可读记录](docs/benchmark-v2.1.json) 和 [变更日志](CHANGELOG.md)。

GitHub Actions 会在 push 和 pull request 时执行测试。上面的实测结果来自本地验证；远程 CI 结果以 Actions 页面为准。

## 范围与限制

- 输出是**所采样页面和状态的快照**，不会自动代表整个品牌、登录后的产品或所有路由。
- 登录墙、反爬挑战或无法访问的页面会报告失败，不把错误页当品牌提取。
- 字体名称和回退栈会保留，字体文件、图片、视频和原站动画实现不打包。
- CSS、元素、滚动和状态采样都有明确上限；重要遗漏需定向补采。闭合 Shadow DOM 不声称已读取。
- 无证据的设计规则不为了凑齐表格而编造。第三方模板需考虑版本、语言、主题与组件范围。
- `token.json` 保持原项目导出器的混合结构，**不声称严格 DTCG 标准合规**；`theme.css` 需要 Tailwind CSS v4 编译。

## 仓库结构

```text
SKILL.md                 Codex skill 入口
agents/openai.yaml       skill 元数据
scripts/                 采集、摘要、编译、验证和打包
scripts/vendor/          固定版本的上游解析/导出模块及许可证
references/              语法、浏览器替代流程、模板对照和来源说明
tests/                   回归测试
docs/                    历史六站、新版24站报告与机器记录
```

## 来源与许可证

项目采用 [Apache-2.0](LICENSE)。包含的 RICOUI 派生代码固定在提交 [`570aef6`](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6)，marked **18.0.3** 保留 MIT 许可证。

完整修改与来源见 [references/upstream.md](references/upstream.md)、[NOTICE](NOTICE)、[scripts/vendor/NOTICE](scripts/vendor/NOTICE)。品牌及网站内容的权利归原权利人；仓库不包含本地采集 HTML、截图或第三方模板库副本。
