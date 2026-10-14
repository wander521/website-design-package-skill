# v2 验证说明

实测日期：2026-10-14。skill 版本：2.0.0。

## 六站实测

| 网站 | 字体栈：旧→新 | 字阶：旧→新 | 新版 CSS 检查 |
|---|---:|---:|---:|
| Apple | 2→3 | 6→10 | 51 |
| Notion | 1→1 | 7→9 | 50 |
| Linear | 1→2 | 6→7 | 43 |
| Raycast | 1→2 | 6→7 | 92 |
| Stripe | 1→3 | 7→9 | 40 |
| Vercel | 1→2 | 7→8 | 35 |

六份新版包合计 311 项 CSS 检查通过。新旧 12 份 ZIP 均恰含 `design.md`、`token.json`、`variables.css`、`theme.css`；标准解包、CRC 与 SHA-256 一致性通过。完整回归测试为 23 项流水线测试、2 项 CSS 浏览器测试和 1 项完整采集测试，共 26 项。

这些是固定日期的本地实测结果，不能代表当前所有品牌页面或将来的提取结果。仓库不发布原始网页采集、截图、第三方模板副本或本机路径。

## 模板对照方法

对照用户指定的 [RICOUI Brands](https://design.ricoui.com/brands)。部署站的文件接口返回 HTTP 429，参考文件改用其开源仓库固定提交 [`570aef63c0b747db8110efae161299948d83b9e6`](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6/public/brands)。未确认该仓库版本与部署站逐字相同。

Apple、Notion、Linear、Raycast 由独立评估者先从实时网页提取，再读取参考模板。六站均采集桌面 1440px 和手机 390px；必要时补采真实组件状态。Stripe 的最终默认浏览器范围为 `zh-us`，语言差异没有当作提取错误。

模板只是第三方分析参考。核对主要看颜色、字体、字号、布局和组件的实际角色，不以 token 数量或全局数值匹配判定正确。参考 JSON 还包含按角色组织的 composite typography 等历史结构，与本 skill 的 RICOUI-compatible 导出格式不同。

## 已修复并验证的缺陷

- 动画和字体未稳定、快速滚动导致首屏空白：增加有界等待和稳定首屏截图。
- 跨域 CSS 无法通过 CSSOM 读取：对实际观察到的样式表进行限量读取，记录失败与上限。
- 导航占满统一元素额度：分组采集标题、正文、动作、技术文字、字段和页尾。
- 父级标题颜色不能代表实际字形：采集内部文字片段，并结合截图分析层叠样式。
- 次要字体漏选：保留角色清单和遗漏提示，补 Berkeley Mono、Geist Mono、SourceCodePro 等。
- hover 与键盘焦点混合：移开鼠标，记录 hovered、focused 和 focusVisible。
- 深层 DOM 路径截断导致选错元素：保留唯一路径并核对目标身份。
- open Shadow DOM 的 consent 弹窗漏采：记录可读弹窗，不提交或修改同意选项。
- 中文标签导致 spacing/type 别名冲突：标识以显式源 token 为准。
- 孤立表格行、重复字体块被静默忽略：核对声明与解析 token 集合。
- 把 max-height 当 radius、把 webinar 变量当首页 max-width：增加属性兼容和来源检查。
- 大量同值正文颜色挤掉真实状态来源：优先保留对应 hover/focus 候选并记录来源数量。

## 仍需人工/代理判断的部分

全部六站最终 `quality.status` 为 `review`，主要由于 CSS/分组/滚动上限和有限状态范围；有效 CSS 不证明整个网站的语义正确。Raycast 保留了 35 项 declaration-only/variable 提示，并在规范里把这些内容限定为已声明的 palette/scale，而非默认的营销组件规则。

来源列表是候选集合，仍需按 selector、property、viewport、state 和截图确认实际角色。新 URL 可能遇到登录墙、挑战页、闭合 Shadow DOM、复杂组合动画、不同语言或未采样路由；这些情况应报告限制、定向补采或停止交付，不能宣称还原完整品牌规范。
