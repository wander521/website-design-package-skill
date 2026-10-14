# RICOUI source grammar

This is the upstream table-based grammar, not Impeccable/Stitch's YAML-frontmatter grammar. The bundled parser does not compile arbitrary prose, frontmatter tokens, or differently headed tables. Write values as a single CSS expression, names as a single `--custom-property`, and roles as prose. Use backticks around token names if desired. Keep values and names separate from provenance. A table cell must not contain an unescaped `|`.

```markdown
# Actual Site Name — Style Reference
> A factual description of the captured visual system.

**Theme:** light

**Source website:** [https://actual.example/path](https://actual.example/path)

This is an extracted snapshot; the live source website remains authoritative.
Captured YYYY-MM-DD, at 1440px and 390px. Scope: this page and visible states.

## Tokens — Colors

| Name | Value | Token | Role |
|---|---|---|---|
| Text | captured CSS color | --color-text | Body text |

### Decorative / Gradient

| Name | Value | Token | Role |
|---|---|---|---|
| Atmosphere | complete captured gradient | --gradient-atmosphere | Observed background |

## Tokens — Typography

### Actual Font Family · `--font-body`
- **Substitute:** captured complete font-family stack, including actual primary font
- **Weights:** only observed numeric weights, comma separated
- **Role:** Body text

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|---|---|---|---|---|
| body | captured size | captured line height | captured tracking or - | --text-body |

## Tokens — Spacing & Shapes

### Spacing Scale

| Name | Value | Token |
|---|---|---|
| Compact | captured value | --spacing-compact |

### Border Radius

| Name | Value | Token |
|---|---|---|
| Card | captured value | --radius-card |

### Shadows

| Name | Value | Token |
|---|---|---|
| Card | captured shadow | --shadow-card |

## Components

### Navigation
**Role:** Main site navigation

Observed colors, typography, spacing, states and mobile behavior. Describe only what exists.

## Do's and Don'ts

### Do
- Preserve the observed hierarchy and relevant roles.

### Don't
- Introduce undocumented states as source facts.

## Imagery

Describe actual imagery/icon treatment and proportions, or omit this section.

## Layout

- **Section gap:** one captured CSS value
- **Card padding:** one captured CSS value
- **Element gap:** one captured CSS value
- **Max content width:** one captured CSS value

Describe observed desktop/mobile arrangements and breakpoint evidence here.
```

This is a grammar illustration, not a fill-in token template. Omit unsupported rows, headings and layout bullets. Core requirements are a real title, description, declared primary theme, exact requested source URL, at least one observed color, a font block with captured full stack, and body typography. Do not insert illustrative placeholder values from this document.

Important parser/export behavior:

- `Substitute` is what upstream writes as the CSS font-family; supply the full original captured stack, not just a fallback, to preserve the site's typography.
- Font weight belongs in the font block; upstream's five-column type scale cannot encode per-role weight. Document those weights in accompanying prose.
- Keep one primary theme per package. A dark package needs dark-state evidence. Additional modes may be separate packages when requested.
- Prefer literal captured computed values where CSS variable dependencies are unavailable. `var()` can remain only when all case-sensitive dependencies are included and resolve in both generated CSS files. Do not manufacture RGB/hex conversions merely to appease exact evidence matching.
- `normal` is valid for line-height/tracking when captured. A `-` tracking cell means absent, not a generated zero. A zero radius or `none` shadow may be included if observed; otherwise omit.
- Responsive pixel sizes from computed styles are a snapshot. Preserve a captured `clamp()` expression from CSS when its association is clear; document the viewport samples in prose. Do not turn arbitrary measured bounding boxes into global scale tokens.
- Tailwind v4 font-size companions use `--text-<role>--line-height` and `--text-<role>--letter-spacing`; the adapter supplies these in addition to upstream variables.
- JSON deliberately follows upstream's hybrid shape: CSS-token-keyed color/spacing/radius/shadow groups with `$value`/`$type`, typography arrays, layout and metadata. It is not a strict DTCG interchange document.
