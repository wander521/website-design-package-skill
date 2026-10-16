**English** · [简体中文](README.zh-CN.md)

# DesignLens

Observe a website. Extract its design language. Check what you build against it.

**An evidence-backed design-system extraction and frontend fidelity skill for Codex.** Turn a live URL into a validated four-file design package, or audit an implemented frontend against a design document and reference captures. Browser evidence, deterministic exports and reviewed findings keep the result traceable.

**[Install](#install-in-codex)** · [Extract a design system](#extract-a-design-system) · [Audit a frontend](#audit-a-frontend) · [Technical guide](GUIDE.zh-CN.md)

DesignLens is the project display name. The installed skill remains **`$website-design-package`**, the repository URL is unchanged, and the current implementation is **v2.3.0**. It builds on the Markdown parser/exporter from [RICOUI DESIGN](https://github.com/ricocc/ricoui-design-md).

## Two connected workflows

| Workflow | Input | Result |
| --- | --- | --- |
| **Extract** | A reachable HTTP(S) website and the requested scope/theme | Observed design rules, a validated four-file ZIP and separate evidence |
| **Audit** | A design document/package and a running frontend; original-site captures when checking reconstruction | Reviewed `audit.md`, mapped measurements, findings and desktop/mobile screenshots |

```text
Live website → desktop/mobile evidence → Codex-authored design.md
                                             ↓
                                  deterministic compiler
                                             ↓
                     token.json + variables.css + theme.css
                                             ↓
                          browser checks + hash validation → ZIP

Design document + implemented frontend + explicit mapping plan
                                             ↓
                  measured styles + state captures + visual review
                                             ↓
                          audit.md + fidelity.json / fidelity.md
```

**Codex interprets the evidence and writes the design document.** The scripts capture, compile, measure, verify and package; a capture command alone does not autonomously create a finished design system. No additional project-specific AI API key is required.

## What is in a design package?

Exactly four files:

| File | Purpose |
| --- | --- |
| `design.md` | Human-readable colors, typography, spacing, shapes, components, layouts and observed scope; the single source of truth |
| `token.json` | RICOUI-compatible, DTCG-style token structure, including component descriptions and the control-coverage ledger |
| `variables.css` | Ordinary CSS custom properties |
| `theme.css` | Tailwind CSS v4 `@theme` directives and required namespace aliases |

JSON and CSS are generated from the same Markdown parse. Correct the Markdown and rerun the pipeline rather than editing exports independently. Fonts are named with their fallback stacks; font files, images, HTML, screenshots and source animation implementations are not included in the ZIP.

## Install in Codex

```sh
git clone https://github.com/wander521/website-design-package-skill.git \
  "$HOME/.codex/skills/website-design-package"
```

If you use a custom `CODEX_HOME`, install under its `skills/website-design-package` directory. Preserve local changes before updating an existing installation. Keep the installed directory and invocation name unchanged even though the display name is DesignLens.

Runtime requirements:

- **Node.js 22+**.
- **Playwright** and Chromium or installed Google Chrome for capture and browser verification.
- The RICOUI parser and export modules are vendored; installing the full upstream website is unnecessary.

For a standalone checkout, install the development/browser dependencies from the repository root:

```sh
npm ci
npx playwright install chromium
```

An existing Codex workspace runtime can be selected using `--playwright /absolute/path/to/node_modules`. See [browser evidence](references/browser-evidence.md) for an explicitly limited browser-tool fallback when dependencies are unavailable.

## Extract a design system

Ask Codex:

```text
Use $website-design-package to extract https://linear.app/ into a design
specification and validated ZIP. Inspect desktop and mobile views,
record component states, and disclose anything that could not be observed.
```

For dark appearance, request it explicitly. A dark color-scheme preference is not proof that the site actually rendered its dark theme.

The workflow captures **1440px desktop and 390px mobile** evidence, computed styles, variables, font inventory, text fragments, accessible stylesheets and representative interaction states. It binds values to the actual visible element, property, viewport and state rather than treating every stylesheet declaration as a brand token.

The compiler rejects missing evidence, malformed/orphaned rows, invalid or duplicate tokens, unsafe CSS and unresolved/circular references. Browser verification checks executable CSS; hash validation checks the final exports and ZIP. Neither proves that a selected semantic role is correct without visual review.

## Audit a frontend

```text
Use $website-design-package to audit http://localhost:3000 against ./design.md.
Check desktop/mobile, dialogs, dropdowns and relevant control states.
Report expected vs actual values, locations, evidence and prioritized fixes.
```

For reconstruction of a specific page, also supply the original site or same-size/theme screenshots. A design document alone can establish compliance with its defined rules, not prove that the original composition, imagery and line breaks were reproduced.

Codex builds an explicit **element → property → viewport → state** mapping. Measurement checks the actual painted styles and rendered fonts; importing the right CSS variables is not sufficient. Results distinguish **pass, mismatch, blocked/incomplete and undefined reference**, and are reviewed alongside screenshots. Mapped CSS checks are never converted into an invented overall fidelity percentage. An audit does not authorize redesign or editing of the target frontend.

### Controls and interaction coverage

The coverage ledger addresses **19 control families**: dialogs, dropdowns, inputs, checkboxes/radios/switches, buttons, date/time, color, file, sliders, tabs, disclosure, tooltips, feedback/errors, progress, tables, pagination and navigation, with grouped categories specified in the [control reference](references/controls.md).

Document whether a control is observed, native, unobserved, blocked or derived from observed primitives. Dialog/dropdown triggers and their open layers both matter. A closed-state select or `appearance: none` does not establish that its native popup is themed. System file pickers and mobile keyboards remain platform boundaries.

The generated CSS contains tokens, **not implemented UI components**. A frontend still needs accessible components and deliberate state handling; themed variables do not justify replacing a product dialog with `alert`, `confirm` or `prompt`.

## Run the helpers directly

From the repository root:

```sh
node scripts/browser.mjs capture https://example.com output/site/capture
node scripts/summarize.mjs output/site/capture/evidence.json
```

Inspect evidence and screenshots, then have Codex author `output/site/draft.md` using the [format contract](references/format.md):

```sh
node scripts/build.mjs compile \
  output/site/draft.md output/site/capture/evidence.json output/site/files
node scripts/browser.mjs verify output/site/files
node scripts/build.mjs pack output/site/files output/site/design-package.zip
```

To inspect a confirmed, reversible popup trigger without choosing an option or submitting data:

```sh
node scripts/browser.mjs inspect https://example.com output/site/popup \
  --trigger '#confirmed-trigger'
```

For mapped fidelity measurements, supply a plan authored for the actual design and page:

```sh
node scripts/fidelity.mjs ./design.md http://localhost:3000 \
  ./plan.json ./output/fidelity
```

The fidelity output directory must be empty. Exit codes: **0** mapped checks pass but still require review; **2** mismatches; **3** incomplete checks; **1** invalid input/runtime failure. Browser commands and fidelity measurement accept `--playwright <node_modules-directory>`. Native/ambiguous controls, inaccessible boundaries and unsupported measurements require explicit disclosure, not guessed expected values.

`validation.json`, captures and working drafts stay outside the four-file ZIP. Read `validation.json.quality` and `cssChecks[].evidenceSources` before delivery. A browser check that failed must not be relabeled successful.

## Tests and recorded validation

```sh
npm run test:unit     # 28 compiler, evidence, reference, export and packaging tests
npm run test:browser  # 23 browser, capture, controls and fidelity tests
npm test             # All 51 tests
```

Use `DESIGN_TEST_PLAYWRIGHT=<node_modules-directory>` to select an existing test runtime. Tests use temporary directories and local HTTP fixtures rather than depending on live brand sites. [GitHub Actions](.github/workflows/test.yml) installs dependencies and runs the suite on pushes and pull requests; consult Actions for the current remote result.

Historical validation is preserved with its original scope:

| Record | Evidence and limits |
| --- | --- |
| [v2 six-site validation](docs/validation.md) | Apple, Notion, Linear, Raycast, Stripe and Vercel; 311 CSS checks across six newer packages |
| [v2.1 benchmark](docs/validation-v2.1.md) | 24 real-site attempts, 23 bounded packages and 952 CSS checks; incomplete Airbnb capture was not counted successful |
| [v2.2 controls](docs/controls-v2.2.md) | Control coverage, state sampling and implementation boundaries |
| [v2.3 fidelity](docs/fidelity-v2.3.md) | Local synthetic fixtures with deliberate design drift, browser-dialog mismatches and explicit uncovered dimensions |

These are recorded evaluations, not new benchmark runs for this documentation refresh or blanket accuracy claims for arbitrary sites. See [CHANGELOG.md](CHANGELOG.md) for the implementation history.

## Limits

- Evidence covers the sampled pages, states, viewport sizes and capture time, not an entire brand or every authenticated route.
- Login walls, anti-bot challenges and unrelated redirects are failures/access limits, not substitute design sources.
- Sampling caps, inaccessible CSS and closed Shadow DOM remain documented boundaries; targeted follow-up evidence may be needed.
- `token.json` is **DTCG-style**, not a claim of strict DTCG standard compliance. `theme.css` requires a Tailwind CSS v4 build.
- Extraction preserves observed design, including any accessibility issues; it does not silently redesign the source. Fidelity audit measures a declared reference and leaves unknown rules unknown.

## Repository map

| Path | Purpose |
| --- | --- |
| `SKILL.md`, `agents/openai.yaml` | Skill workflow and Codex metadata |
| `scripts/` | Capture, summaries, compile/verify/package and fidelity measurement |
| `scripts/vendor/` | Pinned parser/exporter dependencies and license notices |
| `references/` | Format, controls, fidelity, browser fallback, benchmarks and provenance |
| `tests/` | Regression fixtures and tests |
| `docs/` | Versioned validation reports and machine-readable results |
| [Detailed Chinese guide](GUIDE.zh-CN.md) | Preserved operational detail and historical validation context |

## License and provenance

[Apache-2.0](LICENSE). RICOUI-derived code is pinned to [`570aef6`](https://github.com/ricocc/ricoui-design-md/tree/570aef63c0b747db8110efae161299948d83b9e6); **marked 18.0.3** retains its MIT license. Read [upstream provenance](references/upstream.md), [NOTICE](NOTICE) and [vendor notices](scripts/vendor/NOTICE).

Brand names and source-site content remain the property of their respective owners. The repository does not include captured third-party HTML/screenshots or a copied template library. When reporting a mismatch, include the document, mapped element/state, viewport, reproduction steps and available evidence.
