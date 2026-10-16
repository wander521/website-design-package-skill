[English](README.md) · **简体中文**

# DesignLens · 网页设计系统提取与验收

提取设计，保留证据，核对实现。

一个面向 **Codex** 的 skill：把网站转换为经过校验的设计系统包，再检查前端是否真正遵循它。提取颜色、字体、组件与交互状态，让设计参考到实际实现的过程有据可查。

**[安装](#安装)** · [提取](#提取设计系统) · [验收](#验收前端) · [完整指南](GUIDE.zh-CN.md)

**DesignLens** 是展示名；继续用 **`$website-design-package`** 调用，仓库网址和 skill 标识保持不变。当前版本 **2.3.0**。

## 看见差异

<table>
<tr>
<td width="50%"><img src="docs/media/fidelity-matching-dialog.png" alt="本地测试前端应用规范中的弹窗圆角、字体和颜色"></td>
<td width="50%"><img src="docs/media/fidelity-drift-dialog.png" alt="同一本地前端故意改变标题字体、颜色并把弹窗改为直角"></td>
</tr>
<tr>
<td align="center"><strong>按参考规范实现</strong></td>
<td align="center"><strong>故意引入设计偏差</strong></td>
</tr>
</table>

来自 v2.3 本地测试页面的实际截图。桌面/手机合计：正确实现 **24 项映射检查通过**，改动后检出 **10 项偏差**，包括颜色、字体及圆角。这里展示测量覆盖，不是“整体还原度百分比”。[验证报告](docs/fidelity-v2.3.md) · [图片来源](docs/media/SOURCES.md)。

## 核心价值

- **有证据的设计规范。** 桌面/手机截图、计算样式、实际字体及元素/状态映射支撑提取结果，不靠猜 token。
- **一个来源，四份输出。** 修改 `design.md`，同次解析生成 JSON/CSS，再验证、打包。
- **不只颜色与字号。** 记录 19 类控件，包含弹窗、下拉展开态、hover、focus 和平台原生边界。
- **核对实际前端。** 检查真实绘制样式与使用字体；导入正确变量不等于实现正确。
- **便于交付和复用。** 四文件 ZIP、普通 CSS 变量与 Tailwind CSS v4 主题指令，证据另行保存。

## 安装

```sh
git clone https://github.com/wander521/website-design-package-skill.git \
  "$HOME/.codex/skills/website-design-package"
```

自定义 `CODEX_HOME` 时使用对应 skills 目录。需要 **Node.js 22+**、**Playwright** 及 Chromium 或已安装的 Chrome。独立环境可执行：

```sh
npm ci
npx playwright install chromium
```

解析/导出模块已包含，不需要额外项目专用 AI API Key。**Codex 理解证据并编写规范，脚本负责采集、编译和验证。**

## 提取设计系统

```text
用 $website-design-package 提取 https://linear.app/。
生成设计规范和校验后的 ZIP；检查桌面、手机及组件状态，明确无法观测的部分。
```

| ZIP 文件 | 用途 |
| --- | --- |
| `design.md` | 人类可读的设计规范，唯一数据源 |
| `token.json` | RICOUI-compatible、DTCG-style token 与组件覆盖 |
| `variables.css` | 普通 CSS 自定义变量 |
| `theme.css` | Tailwind CSS v4 `@theme` 定义与别名 |

```text
网页 → 浏览器证据 → design.md → 编译 → 浏览器验证 → ZIP
```

ZIP 恰好包含这四个文件。保留字体名称，不打包字体文件；截图、HTML 和工作证据留在包外。

## 验收前端

```text
用 $website-design-package 检查 http://localhost:3000 是否符合 ./design.md。
检查桌面、手机及弹窗/下拉状态，报告预期值、实际值、证据与修正优先级。
```

输出 **`audit.md`**、**`fidelity.json` / `fidelity.md`** 及截图。验收具体原页面的复刻还需原站或对应截图。参考未定义的规则保持未知；验收本身不授权改版。

## 验证与深入阅读

```sh
npm test  # 51 项本地测试：编译、证据、浏览器、控件、还原度
```

| 文档 | 内容 |
| --- | --- |
| [完整指南](GUIDE.zh-CN.md) · [English](GUIDE.md) | 运行时选择、CLI 流程、验收退出码及排查边界 |
| [Skill 工作流](SKILL.md) | Codex 实际遵循的操作说明 |
| [格式](references/format.md) · [控件](references/controls.md) · [验收](references/fidelity.md) | 文件约定与测量范围 |
| [验证历史](docs/validation-v2.1.md) · [变更记录](CHANGELOG.md) | 已记录的真实网站实测与版本历史 |

采集是有限范围快照，不代表完整品牌。CSS 验证不能证明语义角色准确，仍需视觉复核。`token.json` 不声称严格 DTCG 标准合规；生成的 CSS token 不等于实现好的 UI 组件。

## 来源与许可

[Apache-2.0](LICENSE)。基于 [RICOUI DESIGN](https://github.com/ricocc/ricoui-design-md)，固定提交 `570aef6`；marked 18.0.3 保留 MIT 许可。[上游来源](references/upstream.md) · [声明](NOTICE)。原站内容归其权利人；本页配图来自项目本地合成测试页面，不是第三方品牌截图。
