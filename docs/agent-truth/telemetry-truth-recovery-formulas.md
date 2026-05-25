# Telemetry Truth Recovery Formulas

Batch 35 documents telemetry truth recovery formulas so formula-missing rows stop rendering as loaded truth.

Formulas:
- `observedViews = direct observed view events`.
- `checkedViews = observed views after dedupe and validity checks`.
- `finalViews = checked views plus approved estimated recovery when quality allows`.
- `estimatedRatio = estimatedViews / max(finalViews, 1)`.
- `duplicateRate = duplicateViews / max(observedViews, 1)`.
- `confidence = weighted quality score from freshness, duplicates, recovery rate, and source completeness`.

Observed, checked, final, and estimated views remain separate. Estimated recovery must carry quality state, and missing per-drop/per-user rows classify as stale/no-sample/source missing rather than healthy.
