# Task Catalog Runtime Reconstruction

Batch 35 reconstructs task catalog and runtime-sample debug truth without changing rewards, reset policy, creator-spend restrictions, or GumDrop math.

The task catalog lane distinguishes built-in definitions, custom definitions, assignment samples, lifecycle events, rewards, receipts, task rollups, and trigger telemetry mapping. Built-in task count zero is valid only when the catalog source is explicitly missing or a loaded source window proves an empty catalog.

Reward version, multiplier, and built-in average GD can no longer render as valid loaded zeros without source status. Runtime sample zero users/assignments/tasks is classified as no-sample unless a source window proves zero.
