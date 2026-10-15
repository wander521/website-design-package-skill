# Source and adaptations

Source: https://github.com/ricocc/ricoui-design-md
Pinned commit: `570aef63c0b747db8110efae161299948d83b9e6` (retrieved 2026-10-14).

Vendored parser, preview semantics, token syntax, export readiness, JSON and CSS exporters are TypeScript-stripped copies of the corresponding files in `lib/`. Whitespace left by removed type annotations was trimmed. Runtime import paths were changed to relative `.mjs` paths. `lib/utils.mjs` contains only the upstream slugify helper, removing unrelated UI dependencies. All substantial upstream modules retain their behavior. The parser dependency marked 18.0.3 is bundled as `scripts/vendor/marked.mjs`.

Licenses: Apache-2.0 for RICOUI (`scripts/vendor/RICOUI-LICENSE`), MIT for marked (`scripts/vendor/MARKED-LICENSE`). Preserve these files and vendor/NOTICE when distributing the skill. Generated design archives contain extracted user-requested data, not this vendored source.

The orchestration layer intentionally differs from the website's general editor export:

- Exact output names `design.md`, `token.json`, `variables.css`, `theme.css` and no raw-token or preview extras in the design ZIP.
- Captured/published evidence is required; unsupported values are rejected instead of allowing conventional inferred scale rows.
- Adds duplicate-name, case-sensitive reference, unsafe declaration, orphan-row and malformed-table checks, plus real browser validation and file hash checks before packaging.
- The full captured font stack is supplied in the upstream Substitute field to avoid replacing the real font with a generic fallback.
- Adds Tailwind v4 namespace aliases and font-size companions while retaining upstream source variables.
- Removes duplicate color entries for radial/conic gradients that upstream classifies under both colors and gradients.
- Preserves explicit source identifiers independently of localized spacing/type labels, with per-check candidate source records and property compatibility checks.
- Captures categorized DOM/technical text, roots, visible fragments, open-shadow consent, observed cross-origin CSS and isolated hover/keyboard-focus; distinguishes media from container queries and records scope limits.
- Uses a dependency-free deterministic ZIP writer rather than browser Blob/fflate.

The upstream README describes its tokens as DTCG. The actual export code uses strings for dimensions/colors and custom typography arrays; this skill describes it as RICOUI-compatible DTCG-style JSON to avoid promising strict conformance.

Maintainer regression checks: `node --test tests/pipeline.test.mjs` for compilation/ZIP invariants; `node --test tests/browser.test.mjs` with `DESIGN_TEST_PLAYWRIGHT=<modules>` for real browser CSS checks. `node --test tests/capture.test.mjs` exercises full capture against an isolated local fixture, including cross-origin CSS, dense navigation, deep selectors, technical text and shadow consent.

The v2.2 adapter also preserves parsed Components and the control coverage ledger in `token.json.$extensions["website-design-package"]`. This is additive to the upstream core groups; it is not an upstream component implementation or a strict DTCG compatibility certification. CSS remains token declarations.
