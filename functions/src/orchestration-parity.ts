import type {OrchestrationFindingRecord} from "./orchestration-contract.js"
import {readBoolean, readNumber, readString} from "./orchestration-utils.js"

function buildFinding(input: {
  findingKey: string
  severity: "info" | "warn" | "error"
  title: string
  detail: string
  humanSummary: string
  fixSummary: string
  actionType?: "rebuild_projection" | "inspect_source_record"
}) {
  const actionType = input.actionType || "inspect_source_record"
  return {
    findingKey: input.findingKey,
    severity: input.severity,
    title: input.title,
    detail: input.detail,
    humanSummary: input.humanSummary,
    fixSummary: input.fixSummary,
    repair: {
      actionType,
      label: actionType === "rebuild_projection" ? "Rebuild orchestration projection" : "Inspect canonical source",
      detail: actionType === "rebuild_projection"
        ? "Re-run the orchestration pipeline for this canonical record and re-check derived parity."
        : "Inspect the underlying canonical record because required source context is missing.",
      requiresAdminConfirmation: true,
    },
  } satisfies OrchestrationFindingRecord
}

export function evaluateParity(input: {
  sourceCollection: string
  sourceData: Record<string, unknown>
  normalizedEventName: string
  routePath: string
  actorId: string
  creatorContextId: string | null
  contaminationRisk: boolean
  sourceMutation: string
}) {
  const findings: OrchestrationFindingRecord[] = []

  if (!input.actorId && input.sourceCollection !== "analytics_guest_batches") {
    findings.push(buildFinding({
      findingKey: "missing_actor_context",
      severity: "error",
      title: "Missing actor ownership",
      detail: "The canonical record does not identify the actor who caused it.",
      humanSummary: "This signal cannot be safely tied to a user, creator, or admin yet.",
      fixSummary: "Inspect the canonical source record and add the missing actor identifier at write time.",
    }))
  }

  if (!input.routePath && (
    input.sourceCollection === "analytics_event_facts" ||
    input.sourceCollection === "notifications" ||
    input.sourceCollection === "security_events"
  )) {
    findings.push(buildFinding({
      findingKey: "missing_route_context",
      severity: "warn",
      title: "Missing route context",
      detail: "The signal does not include a reliable page or route path.",
      humanSummary: "This event can be counted, but its surface attribution is incomplete.",
      fixSummary: "Inspect the source record and make sure route or page context is carried into the canonical write.",
    }))
  }

  if (input.contaminationRisk) {
    findings.push(buildFinding({
      findingKey: "session_actor_contamination",
      severity: "error",
      title: "Session ownership contamination risk",
      detail: "The current session key was previously seen under a different actor.",
      humanSummary: "This session may be bleeding between identities and should be reviewed before using it for training or attribution.",
      fixSummary: "Inspect the source record and session ownership path for stale client-side state. A projection rebuild can refresh the orchestration summary only.",
      actionType: "rebuild_projection",
    }))
  }

  if (input.sourceCollection === "analytics_guest_batches" && readNumber(input.sourceData.eventCount) <= 0) {
    findings.push(buildFinding({
      findingKey: "guest_batch_without_events",
      severity: "warn",
      title: "Guest batch has no events",
      detail: "A guest analytics batch arrived without any event payloads.",
      humanSummary: "Anonymous telemetry reached the server, but there was no useful batch content to interpret.",
      fixSummary: "Inspect the source batch payload and guest queue flush path.",
    }))
  }

  if (input.sourceCollection === "analytics_event_facts" && input.normalizedEventName.startsWith("viewer_")) {
    const watchSessionId = readString(input.sourceData.watchSessionId) || readString(input.sourceData.sessionId)
    if (!watchSessionId) {
      findings.push(buildFinding({
        findingKey: "viewer_event_missing_watch_session",
        severity: "warn",
        title: "Viewer event missing watch-session ownership",
        detail: "A viewer telemetry fact was written without a watch session identifier.",
        humanSummary: "Watch analytics can still count this event, but accurate session stitching is incomplete.",
        fixSummary: "Inspect the canonical event write path or rebuild the orchestration projection after a corrected replay.",
        actionType: "rebuild_projection",
      }))
    }
  }

  if (input.sourceCollection === "analytics_watch_sessions") {
    if (readBoolean(input.sourceData.isClosed) && readNumber(input.sourceData.totalWatchSeconds) <= 0) {
      findings.push(buildFinding({
        findingKey: "closed_watch_session_without_duration",
        severity: "warn",
        title: "Closed watch session without watch time",
        detail: "The watch session is closed, but total watch time never advanced above zero.",
        humanSummary: "The session lifecycle closed cleanly, but the resulting watch signal looks incomplete.",
        fixSummary: "Inspect the final heartbeat/close flush path or rebuild the orchestration projection after replay.",
        actionType: "rebuild_projection",
      }))
    }
  }

  if (input.sourceCollection === "daily_task_events") {
    if (readString(input.sourceData.type) === "completed" && readNumber(input.sourceData.reward) > 0 && !readString(input.sourceData.userId)) {
      findings.push(buildFinding({
        findingKey: "rewarded_task_without_user",
        severity: "error",
        title: "Rewarded task missing user ownership",
        detail: "A completed task with a reward does not identify the user who earned it.",
        humanSummary: "Task parity cannot be trusted for this record until user ownership is repaired.",
        fixSummary: "Inspect the canonical task event record and confirm the user identifier is present.",
      }))
    }
  }

  if (input.sourceCollection === "transactions") {
    const status = readString(input.sourceData.status)
    if (status === "completed" && (
      input.sourceData.balanceBefore === undefined ||
      input.sourceData.balanceAfter === undefined
    )) {
      findings.push(buildFinding({
        findingKey: "ledger_transaction_missing_balance_edges",
        severity: "warn",
        title: "Ledger transaction missing balance edges",
        detail: "A completed ledger transaction does not include both balanceBefore and balanceAfter.",
        humanSummary: "The Gum Drop ledger can still count revenue, but replay-safe balance auditing is weaker for this transaction.",
        fixSummary: "Inspect the canonical transaction writer and restore before/after balance fields.",
      }))
    }
  }

  if (input.sourceCollection.startsWith("creator_") && !input.creatorContextId) {
    findings.push(buildFinding({
      findingKey: "creator_signal_missing_creator_context",
      severity: "error",
      title: "Creator signal missing creator context",
      detail: "A creator-system record does not identify which creator it belongs to.",
      humanSummary: "Creator attribution, earnings, and recommendation context are incomplete for this record.",
      fixSummary: "Inspect the creator source record and restore the creator identifier.",
    }))
  }

  if (input.sourceCollection === "notifications" && !readString(input.sourceData.userId)) {
    findings.push(buildFinding({
      findingKey: "notification_missing_target_user",
      severity: "warn",
      title: "Notification missing target user",
      detail: "A notification record does not identify the intended recipient.",
      humanSummary: "Notification delivery can be stored, but it cannot be tied back to a user safely.",
      fixSummary: "Inspect the notification source record and restore the target user identifier.",
    }))
  }

  if (input.sourceCollection === "security_events" && !input.routePath) {
    findings.push(buildFinding({
      findingKey: "security_event_missing_surface_context",
      severity: "warn",
      title: "Security signal missing surface context",
      detail: "A security event does not include where it was triggered.",
      humanSummary: "The signal is preserved, but the engine cannot clearly explain what surface produced it.",
      fixSummary: "Inspect the security source record and include the triggering route or page context.",
    }))
  }

  return findings
}
