# Controls — Style Reference
> Synthetic reference for fidelity acceptance tests, not a production brand.

**Theme:** light

## Tokens — Colors

| Name | Value | Token | Role |
|---|---|---|---|
| Ink | #152238 | --color-ink | Text |
| Accent | #245ccc | --color-accent | Focus and selected controls |
| Surface | #fff | --color-surface | Panels |
| Hover | #e3edff | --color-hover | Unselected option hover |

## Tokens — Typography

### Sans · `--font-body`
- **Substitute:** sans-serif
- **Weights:** 400, 700
- **Role:** All text

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|---|---|---|---|---|
| body | 16px | 1.5 | normal | --text-body |

## Tokens — Spacing & Shapes

### Spacing Scale

| Name | Value | Token |
|---|---|---|
| Panel | 24px | --space-panel |

### Border Radius

| Name | Value | Token |
|---|---|---|
| Dialog | 11px | --radius-dialog |
| Dropdown | 9px | --radius-dropdown |

## Layout

- **Max content width:** 880px

## Components

### Dialog
**Role:** Edit details
Panel uses --radius-dialog, --space-panel and --color-surface. Backdrop background is rgba(9, 20, 31, 0.55). Business popups must use the styled frontend panel.

### Dropdown
**Role:** Choose plan
Panel uses --radius-dropdown. Unselected option hover uses --color-hover.

### Focus
**Role:** Keyboard navigation
Focus outline width is 3px, color --color-accent.

### Mobile
**Role:** Responsive layout
The typography remains 16px at both inspected widths.
