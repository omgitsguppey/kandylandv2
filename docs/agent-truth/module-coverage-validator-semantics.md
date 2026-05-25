# Module Coverage Validator Semantics

Module coverage now separates required and optional modules. Required verified = 1.0, required partial = 0.5 unless a critical required source is missing then 0.35, and required empty = 0. Optional modules are excluded from the required parity score and shown separately.

The module coverage row uses evidence samples instead of labeling verified module count as samples. Blocked reasons name the required modules that are empty or partial.
