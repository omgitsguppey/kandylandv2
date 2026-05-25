export type SourceWindowZeroShellStatus =
  | "loaded_with_data"
  | "loaded_empty_with_source_window"
  | "source_ready_no_sample_loaded"
  | "source_missing_actionable"
  | "stale_rebuild_required"
  | "formula_missing_actionable"
  | "registry_missing_actionable"
  | "unavailable"
  | "failed"
  | "unknown";

export type FormulaState = "documented" | "missing" | "unknown" | "not_applicable";
export type FreshnessState = "fresh" | "live" | "current" | "stale" | "expired" | "unknown";

export interface SourceWindowZeroShellInput {
  sourceWindowStartUtc?: string | null;
  sourceWindowEndUtc?: string | null;
  generatedAtUtc?: string | null;
  lastRebuildAtUtc?: string | null;
  sampleCount?: number | null;
  rowsLoaded?: number | null;
  formulaState?: FormulaState | null;
  freshnessState?: FreshnessState | null;
  sourcePath?: string | null;
  sourceReady?: boolean;
  sourceExists?: boolean;
  registryExists?: boolean;
  unsupportedRuntime?: boolean;
  loadError?: string | null;
  nextAction?: string | null;
}

export interface SourceWindowZeroShellClassification {
  status: SourceWindowZeroShellStatus;
  sourceWindowStartUtc: string | null;
  sourceWindowEndUtc: string | null;
  generatedAtUtc: string | null;
  lastRebuildAtUtc: string | null;
  sampleCount: number;
  rowsLoaded: number;
  formulaState: FormulaState;
  freshnessState: FreshnessState;
  sourcePath: string | null;
  nextAction: string;
  explanation: string;
}

function cleanString(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 && trimmed !== "unknown" ? trimmed : null;
}

function nonNegative(value: number | null | undefined) {
  return Number.isFinite(value) && Number(value) > 0 ? Math.floor(Number(value)) : 0;
}

function hasSourceWindow(input: SourceWindowZeroShellInput) {
  return Boolean(cleanString(input.sourceWindowStartUtc) && cleanString(input.sourceWindowEndUtc));
}

export function classifySourceWindowZeroShell(input: SourceWindowZeroShellInput): SourceWindowZeroShellClassification {
  const sampleCount = nonNegative(input.sampleCount);
  const rowsLoaded = nonNegative(input.rowsLoaded);
  const formulaState = input.formulaState ?? "unknown";
  const freshnessState = input.freshnessState ?? "unknown";
  const sourceWindowKnown = hasSourceWindow(input);
  const generatedAtUtc = cleanString(input.generatedAtUtc);
  const lastRebuildAtUtc = cleanString(input.lastRebuildAtUtc);
  const sourcePath = cleanString(input.sourcePath);

  let status: SourceWindowZeroShellStatus = "unknown";
  let explanation = "Source state could not be classified from the loaded panel payload.";
  let nextAction = cleanString(input.nextAction) || "Attach source window, freshness, formula, and source-path evidence before treating this panel as loaded.";

  if (input.loadError) {
    status = "failed";
    explanation = "The source route failed and cannot be represented as loaded.";
    nextAction = cleanString(input.nextAction) || "Inspect the bounded debug route error and return a safe failed terminal state.";
  } else if (input.unsupportedRuntime) {
    status = "unavailable";
    explanation = "The runtime does not support this evidence lane.";
    nextAction = cleanString(input.nextAction) || "Document the unsupported runtime lane or remove it from required debug parity.";
  } else if (input.registryExists === false) {
    status = "registry_missing_actionable";
    explanation = "The registry source is missing, so configured zero cannot be trusted.";
    nextAction = cleanString(input.nextAction) || "Create or wire the registry source before interpreting configured count as zero.";
  } else if (input.sourceExists === false || !sourcePath) {
    status = "source_missing_actionable";
    explanation = "The panel has no proven source path.";
    nextAction = cleanString(input.nextAction) || "Wire the canonical source path and bounded sample window.";
  } else if (formulaState === "missing" || formulaState === "unknown") {
    status = "formula_missing_actionable";
    explanation = "The panel cannot explain its math because a formula is missing or unknown.";
    nextAction = cleanString(input.nextAction) || "Document the formula contract and expose the numerator, denominator, and quality state.";
  } else if (input.sourceReady && rowsLoaded === 0 && sampleCount === 0 && !sourceWindowKnown) {
    status = "source_ready_no_sample_loaded";
    explanation = "The source exists but no bounded sample was loaded.";
    nextAction = cleanString(input.nextAction) || "Load a bounded sample or display this lane as no-sample, not healthy.";
  } else if (!generatedAtUtc || freshnessState === "stale" || freshnessState === "expired") {
    status = "stale_rebuild_required";
    explanation = "The loaded panel is stale or lacks generated-at provenance.";
    nextAction = cleanString(input.nextAction) || "Run or wait for the bounded rebuild/materializer and keep this panel stale until it refreshes.";
  } else if (rowsLoaded > 0 || sampleCount > 0) {
    status = "loaded_with_data";
    explanation = "Rows or samples are present in the current bounded source window.";
    nextAction = cleanString(input.nextAction) || "Review any failed rows before promoting this panel.";
  } else if (sourceWindowKnown) {
    status = "loaded_empty_with_source_window";
    explanation = "The source loaded with a known source window and zero rows.";
    nextAction = cleanString(input.nextAction) || "Treat as a proven empty sample only for this bounded source window.";
  }

  return {
    status,
    sourceWindowStartUtc: cleanString(input.sourceWindowStartUtc),
    sourceWindowEndUtc: cleanString(input.sourceWindowEndUtc),
    generatedAtUtc,
    lastRebuildAtUtc,
    sampleCount,
    rowsLoaded,
    formulaState,
    freshnessState,
    sourcePath,
    nextAction,
    explanation,
  };
}

export function statusBlocksHealthyLoaded(status: SourceWindowZeroShellStatus) {
  return status !== "loaded_with_data" && status !== "loaded_empty_with_source_window";
}
