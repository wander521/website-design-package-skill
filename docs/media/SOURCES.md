# README screenshot sources

These are unmodified browser captures from the project's own controlled fidelity fixture, recorded on 2026-10-15. They are not screenshots of a third-party brand or a separate DesignLens dashboard.

| File | Original capture | Context |
| --- | --- | --- |
| `fidelity-matching-dialog.png` | `matching-final/desktop-1.png` | Documented styles applied, native HTML dialog open |
| `fidelity-drift-dialog.png` | `drift-final/desktop-1.png` | Intentionally changed heading color/font and dialog/dropdown radii |

The original local run was `output/design-package-fidelity-v23/`. Reproducible test behavior is defined in `tests/fidelity.test.mjs`; published results and limitations are in [v2.3 validation](../fidelity-v2.3.md) and its JSON record. The reported 24 passes and 10 mismatches span desktop/mobile mapped checks, not these two screenshot pixels alone and not an overall visual-similarity percentage. This documentation refresh did not rerun those historical evaluations.
