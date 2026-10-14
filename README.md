# Website Design Package Skill

把一个网页网址交给 Codex，提取有证据支持的设计系统，生成经过校验的四文件 ZIP。

```text
用 $website-design-package 提取 https://目标网站
```

基于 [RICOUI DESIGN](https://github.com/ricocc/ricoui-design-md) 的 Markdown 解析与导出流程，当前版本 **2.0.0**。

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
npm run test:unit     # 23 项编译、证据、引用、导出和打包测试
npm run test:browser  # 3 项真实浏览器与本地采集测试
npm test             # 全部 26 项测试
```

已有运行时也可通过 `DESIGN_TEST_PLAYWRIGHT=<node_modules目录>` 指定测试依赖。测试使用临时目录和本地 HTTP 页面，不依赖实时品牌网站。

2026-10-14 的 v2 实测覆盖 **Apple、Notion、Linear、Raycast、Stripe、Vercel**：六份新版包合计 **311 项 CSS 校验通过**，新旧共 12 份 ZIP 的四文件集合、CRC 和 SHA-256 核验通过。

这次对照修复了跨域 CSS 遗漏、动画截图时序、次要字体漏选、中文变量冲突、孤立 token 行、hover/focus 混合和深层 DOM 元素误选等问题。详细范围与限制见 [验证说明](docs/validation.md)。

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
docs/validation.md       六站实测说明
```

## 来源与许可证

项目采用 [Apache-2.0](LICENSE)。包含的 RICOUI 派生代码固定在提交 [`570aef6`](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6)，marked **18.0.3** 保留 MIT 许可证。

完整修改与来源见 [references/upstream.md](references/upstream.md)、[NOTICE](NOTICE)、[scripts/vendor/NOTICE](scripts/vendor/NOTICE)。品牌及网站内容的权利归原权利人；仓库不包含本地采集 HTML、截图或第三方模板库副本。
