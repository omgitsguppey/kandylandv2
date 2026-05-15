# Product Surface Integrity

Product surface integrity is the source-driven cleanup lane for issues the repo already reports through generated artifacts, validators, route contracts, Debug evidence, and static UI/CSS source. It is not a screenshot pass and it is not a broad redesign pass.

## Current Contract

- Primary product UI must not expose generated report filenames, internal source keys, Debug-only doctrine copy, raw sourceTruth/sourceFreshness/sampleCount prose, or repeated snapshot-wait values.
- Debug may expose source paths, generated report names, formulas, fallback mechanics, and raw evidence when the surface is labeled Debug/details/title/data metadata.
- Connected sections must prove route to data to UI to validator. Unconnected sections must be demoted to configuration-only, blocked, or a precise owner-backed follow-up.
- Creator dashboard managers are lazy-mounted by active section. A manager must not fetch on page load unless its section is opened.
- Mutating routes with a declared body limit must parse with the bounded JSON body helper before schema parsing.
- Array fanout must use bounded worker pools or a source-visible fixed-size/cost-bound marker.
- Generated reports are evidence snapshots. A stale report must be labeled stale/evidence-only and cannot override current runtime source.

## Validator

Run:

```bash
npm run check:product-surface-integrity
```

The validator writes `agent/state/product-surface-integrity.generated.json` for current HEAD and fails on current fake actions, primary Debug/source-copy leaks, stale product-surface report state, missing next-fix order, creator manager fetch-all regressions, and body-limit/request-json regressions on routes that declare a body cap.

## Current Follow-Up Order

1. Add `readBoundedJsonBody` to admin routes still flagged by speed-security body-limit findings.
2. Refresh or archive stale generated reports with the owning validator instead of consuming them as live truth.
3. Bound or source-mark current Promise.all map fanout findings outside forbidden surfaces.
4. Review Admin mobile nested-scroll regions with source-approved ownership markers or compact layout fixes.
