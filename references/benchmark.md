# Compare against a design template

Use this workflow when the user requests a template comparison or skill benchmark. Ordinary URL extraction does not require downloading a reference library.

Extract independently from the live site first; then inspect the corresponding template. Record reference URL, version/hash and retrieval/access limits. When a deployed library is blocked, use its published source repository and clearly identify the substitute. Match route, locale, viewport and theme; differences across those scopes or capture dates are not automatically extraction errors.

Compare observed roles, not only token counts:

- Main canvas, text, accent and CTA default/hover/focus; separately identify decorative/status colors.
- Actual primary and secondary fonts; code/mono/editorial roles and per-role weights.
- Desktop/mobile typography, content width, spacing, corners and depth.
- Real navigation, actions, fields, repeated surfaces and imagery composition.
- Output consistency and dropped declarations; a passing CSS parser does not establish visual accuracy.

A third-party template can be broader, older, inspired or inferred. Categorize every material difference as: extraction omission; incorrect extraction role/value; template not supported by the current sampled scope; or scope/version difference. Do not manufacture tokens to equalize counts. Do not call an unsupported template value false across the entire brand; it may belong to another route or state.

Use source selector/property and an evidence pointer for each concrete finding. `validation.json.cssChecks[].evidenceSources` identifies origins; computed/state origins support the sampled instance, while declared variables require scope/role confirmation. `quality.fontInventory` and capture coverage expose potential omissions. Derived JSON/CSS should share the same Markdown revision, even if the library's separate files differ in schema or content.

Change the skill only for demonstrated failures, add a meaningful regression check, and retry the affected samples. Preserve the baseline and failed drafts; report inaccessible cases separately. End with the specific improvements, tested sites, outstanding scope limits and a current skill package.
