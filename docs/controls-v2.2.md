# v2.2 控件审计与补齐

2026-10-15，针对“用设计包生成前端时，弹窗、下拉和其他控件会退回浏览器默认样式”的问题，检查了当前 skill、解析/导出代码及历史23份成功包。

## 确认的缺口

历史23份包均没有专门的 Dialog / Dropdown 组件节、全控件覆盖账本或 Frontend Implementation 约定。部分包记录了 Cookie 遮罩，但这不等于业务弹窗规范。采集器主要覆盖静态页面及按钮 hover/focus，没有系统采集展开的选择面板与选项状态。

上游 JSON 导出器没有输出解析后的 Components，因此即使 Markdown 里有组件说明，只读 JSON 的消费者仍会丢失这些说明。两个 CSS 文件仅定义变量/主题命名空间，没有组件选择器或行为实现；加载它们并不会自动给表单或弹窗上样式。

这证明交付约定不足，**不证明下游项目一定调用了浏览器弹框**：本次没有用户旧项目代码可审计。历史24站/952项CSS验证只证明其已声明范围，不能当作完整控件库验证；这些历史包未被改写为v2.2成功样例。

## 本轮覆盖

| 控件组 | 新增检查与交付要求 |
|---|---|
| Dialog / drawer | 触发器、打开面板、backdrop、关闭、焦点恢复、长内容/手机范围 |
| Select / combobox / menu | 字段与展开层分别记录；选中/禁用/hover；native select/datalist 边界 |
| Input / textarea | label、placeholder、输入/只读/禁用、焦点、显式错误与关联文案 |
| Checkbox / radio / switch | checked、mixed、disabled、可视label/pseudo、实际绘制状态 |
| Button | 主要/次要/危险动作与 disabled/loading/focus，禁止为了采样提交动作 |
| Date/time / color / file / range | 可见触发器/轨道与状态；系统选择器、手机键盘与平台窗口边界 |
| Tabs / disclosure / navigation / pagination | selected/expanded、指示线、关联内容与滚动范围 |
| Tooltip / feedback / progress | DOM tooltip 与 title 区分；错误/状态/加载；ARIA状态及进度数值 |
| Table / grid | 表头/单元格样式、sort/selection状态、滚动和分页范围 |

清单共19个稳定类别；此表将相关类别合并展示。检测依赖 DOM/ARIA，不能证明语义不完整、iframe 或闭合 shadow 中的控件不存在。重要遗漏仍需定向补采。

## 实现变化

1. `capture` 输出 controlInventory、floatingControls 及相关状态。隐藏声明只作发现线索，不进入可见样式证据。
2. `inspect --trigger` 仅激活已核对的明确 popup 控件；桌面1440/手机390，记录closed/opened/item-hover/after-Escape。提交/重置按钮、导航、浏览器JS弹框和无对应面板停止，不产生成功证据。
3. 对所有前端参考包要求控件账本及实现约定：observed/native/not-observed/blocked/derived。推荐实现与源站事实分开。
4. `token.json.$extensions['website-design-package']` 从同一 Markdown 保留组件说明和结构化账本。上游核心 token 组保持原形状；CSS不变成虚构组件代码。
5. 缺少覆盖账本、遗漏可见控件、缺少实现约定、只观测关闭的popup、Escape/焦点恢复失败以及原生选择器边界会出现在质量报告。

## 验证

- **44项回归测试通过**，包含19类别、隐藏/打开面板、真正的HTML dialog backdrop、checked/mixed、invalid/readonly/disabled、表格/进度、原生select/datalist、深色偏好、动态popup关联、JSON组件保留及拒绝提交/JS alert。
- 本地隔离fixture的Dialog和Dropdown在两种视口均打开后由Escape关闭、焦点恢复；原生select不假装取得OS弹层样式。
- 四文件样例经真实浏览器 **10项CSS检查**，标准ZIP四文件集合、CRC和SHA-256核验通过；覆盖/组件/实现约定类遗漏告警为空。示例是测试fixture，不是生产组件库或任何品牌的设计。
- [Radix公开Dialog示例](https://www.radix-ui.com/primitives/docs/components/dialog)在桌面与手机均采到实际portal弹窗，Escape关闭及焦点恢复通过；没有点击Save changes或提交表单。
- [WAI公开Select-only示例](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/)在桌面与手机均采到打开列表/选项，Escape关闭及焦点恢复通过。首次触发器位于视口底部，列表落到视口外，按失败保留；将触发器居中后完成一次补验。默认inspect现在明确记录居中，不声称验证边缘碰撞。
- 桌面/手机截图已合批人工检查。测试fixture的禁用文字对比度及复选框标记在一批内修正；这些是测试页面，不会用来覆盖源站缺陷。

机器可读指标及哈希见 [controls-v2.2.json](controls-v2.2.json)。

## 实际边界

源站没展示的组件不能编造为已抽取。新应用需要这些组件时，应依据已观测的颜色/字体/形状等原语作明确派生，并用项目现有可访问组件体系实现。业务对话框不应悄悄降为alert/confirm/prompt，但**完整样式化的HTML dialog可以保留原生语义**。系统文件窗口、手机键盘和权限界面保留系统能力。

CSS支持检查与控件账本是提示和证据机制，不是未来前端的行为测试。完整Tab循环、方向键/输入筛选、所有控件状态转换、屏幕阅读器、嵌套遮罩、边缘碰撞、长内容和跨浏览器原生picker仍需在目标应用验证，不能从这轮结果推断已全部通过。

本地证据、截图、失败记录和样例包在 `output/design-package-controls-v22/`；公开仓库仅包含可重复测试、规则及汇总，不包含公开站HTML副本。
