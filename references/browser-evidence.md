# Browser-tool fallback

Use this when Playwright cannot be run but a browser tool is available. Follow the browser tool's own initialization and evaluation restrictions; do not execute Node/file/network helpers inside page evaluation. A text-only web fetch or screenshot alone is insufficient for exact token extraction.

Open the supplied URL. Inspect a desktop and a mobile viewport using supported browser controls. Capture screenshots and evaluate read-only DOM/computed-style queries on body, headings, navigation, links, buttons, inputs and repeated surfaces. Wait for fonts to finish loading. Also sample visible nonsemantic surfaces and their ::before/::after styles when they carry backgrounds, gradients, shadows or rounding; save these in `samples[].surfaces` with the same shape as an element. Collect accessible CSSOM declarations, including root variables, and record inaccessible cross-origin stylesheets. Published DESIGN.md links are optional evidence. Check the final page is the intended website.

Save the returned data with file tools as `evidence.json` with this structure (all values must be actual observations):

```json
{
  "schemaVersion": 1,
  "requestedUrl": "exact user URL",
  "finalUrl": "observed page URL",
  "status": 200,
  "capturedAt": "ISO timestamp",
  "source": {
    "title": "observed title",
    "declarations": [{"selector": ":root", "property": "--actual-name", "value": "observed value"}],
    "inaccessibleStylesheets": [],
    "breakpoints": [],
    "links": []
  },
  "samples": [{
    "viewport": {"width": 1440, "height": 1000},
    "elements": [{"tag": "body", "text": "...", "styles": {"color": "computed color", "font-family": "computed stack", "font-size": "computed size", "font-weight": "computed weight", "line-height": "computed line height"}}]
  }],
  "notes": []
}
```

Use the actual response status when the browser exposes it; when unavailable, record status 200 only after verifying page identity and note `HTTP status unavailable in browser tool; page identity checked` in notes. Never record a challenge or error page as successful evidence. Include both viewport samples and actual screenshot files in the working capture directory.

For CSS verification, read `validation.json` and generated CSS with file tools, then pass that text/data into a blank isolated page using supported browser controls. Execute exactly the equivalent checks in `scripts/browser.mjs`'s `checkCss`: run `CSS.supports(property, value)` for every cssChecks entry; inject `variables.css`; ensure named custom properties are nonempty; inject theme.css with its actual directive (not the comment) replaced using `/^\s*@theme\s*\{/m` → `:root {`; ensure both sheets parsed. Record any failure. Only when all checks pass, use file tools to set `browserVerified: true` in validation.json. Do not change `hashes` or other generated values. Then run `build.mjs pack`.
