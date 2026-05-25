# Behavior Normalization Internals

Batch 35 reconstructs the behavior-normalization debug source contract around inspected event counts, health math, domain coverage, and dependency gaps.

The panel now reports zero-shell source state through the shared classifier. Health math must include formula, numerator, denominator, confidence, and missing source reasons. Coverage by domain and dependency gap zeros are meaningful only after inspected normalized events exist or a bounded source window proves zero.

This batch does not fake normalized events. If normalized events and eval eligibility are both zero without source-window evidence, the panel remains no-sample/source-missing/actionable instead of loaded healthy.
