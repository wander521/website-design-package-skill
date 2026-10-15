# Controls and downstream implementation

Read this for every extraction intended as a frontend reference. Tokens alone do not implement controls. Inspect visible instances, discover closed triggers, and document missing families without inventing source behavior. Do not infer a complete UI kit from a marketing homepage.

## Inventory and scope

`capture` records `samples[].controlInventory` and `floatingControls`, including hidden/closed declarations, native element types, disabled/checked/indeterminate/selected/expanded/invalid/readonly states, and visible styles. Hidden declarations are discovery hints, not painted-style evidence. Read `coverage.control-*` caps. Custom controls without ARIA may need targeted DOM queries; these detectors cannot prove absence.

Inspect these families when present:

| Family | Capture or disclose |
|---|---|
| Dialog / drawer | Closed trigger, opened panel, backdrop, content/close/primary actions, width and max height, scrolling, mobile arrangement, focus entry/return and dismissal |
| Dropdown / select / combobox / menu | Field/trigger and opened panel separately (native datalist is a separate boundary); selected, hovered, focused, disabled items; option typography/checkmark/dividers; long lists, clipping, placement and mobile behavior |
| Text fields / textarea / number / search | Label, placeholder, actual text, border/background, caret, padding, readonly/disabled, focus, help/error text; password visibility affordance if present |
| Checkbox / radio / switch | Checked, unchecked, mixed/indeterminate if applicable, disabled and focus; glyph/track/thumb, labels and error relationships |
| Buttons | Primary/secondary/destructive roles, hover/focus, disabled/loading and icon treatment; do not trigger destructive or submission actions |
| Date/time / color / file / range | Theme the visible field/trigger/track; identify the native picker boundary. Preserve native file windows, mobile keyboard and platform permissions |
| Tabs / disclosure / navigation / pagination | Selected/expanded/disabled states, underline/indicator, focus, keyboard intent, content association and mobile overflow |
| Tooltip / feedback / progress | Actual tooltip, toast/status, inline error, loading/empty/success states if present; timing, non-color feedback, accessible announcement. A `title` attribute is a native tooltip, not a captured custom tooltip |
| Table / grid | Header/body/selected/hover/empty/loading rows, sorting affordance, density, scrolling and pagination if observed |

A state not visible or safely reachable is `not-observed` or `blocked`, not an invitation to fabricate. Native control semantics do not imply unstyled visuals. Preserve source defects as observations, with implementation recommendations labeled separately.

## Open-state evidence

First identify an exact, reversible trigger by reading its label, DOM and screenshot. Then use:

```sh
node <skill>/scripts/browser.mjs inspect '<url>' '<work>/inspect-menu' --trigger '#exact-trigger' [--playwright '<modules>']
```

This centers the identified trigger for inspection (edge collisions still need a separate check), opens only that explicit semantic popup trigger, captures closed/opened and item hover at desktop/mobile sizes, then presses Escape and records whether it closed and focus returned. It does not choose options, submit forms or confirm actions. Disabled/submitting/reset controls, ambiguous triggers, navigation, browser JS dialogs, and missing associated panels stop inspection. A native select or datalist is recorded without opening its OS picker. This helper does not prove complete keyboard behavior or screen-reader support.

Use a supported browser tool for ambiguous custom markup, keyboard Arrow/Home/End/Tab behavior, nested menus, collision edges, long content and other important missing states; do not blindly click candidate buttons. Do not accept consent, save settings, purchase, delete or submit merely to sample a component. Initial page access and a trigger click may still run site JavaScript, so inspect its intent first.

Keep each inspection in a fresh working directory. Merge actual `samples`, `controlInteractions`, declarations and notes into the working evidence only after checking site identity and route/theme consistency. Preserve per-sample capture time, URL, version and source file. Readable opened dialog `::backdrop`, popup/item styles and selected/disabled states can support tokens; native browser picker pixels cannot be derived from page CSS. Save the desktop/mobile screenshots alongside evidence.

## Required Markdown handoff

Inside `## Components`, include component descriptions/bullets for observed controls and these three sections. Use prose/bullets: upstream component parsing does not retain arbitrary tables in JSON descriptions.

```markdown
### Dialog
**Role:** Dialog coverage

Not observed on this source route. No source dialog styles or behavior are claimed.

### Dropdown / Select
**Role:** Dropdown coverage

Observed custom listbox. Include evidence selectors, tokens and open/closed/item states, or describe the native/blocked boundary.

### Control Coverage
**Role:** Reference coverage ledger

- dialog: not-observed — no safely reachable source instance
- dropdown: observed — source selectors and open-state evidence
- text-field: observed — labels, focus and error states; list any missing states
- checkbox: not-observed — not found in the sampled scope
```

Complete the ledger for `dialog`, `dropdown`, `text-field`, `checkbox`, `radio`, `switch`, `button`, `date-time`, `color`, `file`, `range`, `tab`, `disclosure`, `tooltip`, `feedback`, `progress`, `table`, `pagination`, `navigation`. Each entry uses `observed`, `native`, `not-observed`, `blocked`, or `derived`, followed by its actual scope. `derived` is a proposed frontend adaptation, not an observed source component. The template above is illustrative, not evidence to copy.

Add a `### Frontend Implementation` component with `**Role:** Downstream implementation requirements`. It must convey:

- Apply the design system to every application-needed control and its states. Prefer the project's existing accessible primitives and component library, adapting their theme rather than mixing unrelated defaults. An unobserved reference component needs an explicitly derived implementation using observed primitives; do not pretend it was extracted.
- Business dialogs, confirmations and data-entry popups must not silently use `window.alert()`, `window.confirm()` or `window.prompt()`. A fully styled HTML `<dialog>` with a styled `::backdrop` is valid; native HTML semantics are not the same as browser JS popups.
- When a branded dropdown is required, style the opened panel and items as well as the field. `appearance: none` on `<select>` alone does not guarantee a branded native option popup. Use an accessible custom select/combobox, or a supported customizable native select only after checking target browsers and the opened picker. Intentional native/mobile picker behavior must be explicit.
- Theme text fields, textarea, checkbox/radio/switch, range, date/color/file triggers, tabs/disclosures, pagination/table states, tooltips, status/error/loading/empty feedback consistently. Preserve appropriate OS windows, mobile keyboards and permission UI. Do not fake native security surfaces or replace accessible controls with decorative nonfunctional divs.
- Use themed inline validation with associated help/error text, not browser validation bubbles as the only product error UI. Preserve real form semantics; implementation details depend on the app.
- Validate modal focus containment and return, Escape/close behavior, scroll locking and long-content overflow. Validate select/listbox arrows and selection, menu actions, disabled/selected states, accessible names and focus visibility. Tooltips must not contain required actions; status messages should announce without unnecessarily stealing focus. Use appropriate patterns for each widget rather than treating all popups as menus.
- Verify rendered controls, including open states, at desktop and mobile sizes. Check portal/top-layer positioning, clipped scroll containers, collision placement, nested overlays, stacking and keyboard usage. Styling `z-index` alone does not establish correct top-layer behavior. Report untested platform boundaries.

These are downstream requirements, not claims that the source complies. CSS/JSON validation cannot certify the future application's component behavior. Consumers must read design.md or `token.json.$extensions['website-design-package']`; CSS variables alone are not a UI component library.

## Primary references

- [WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [WAI combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [WAI menu button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)
- [MDN dialog styling and backdrop](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)
- [MDN customizable select and compatibility](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select)
