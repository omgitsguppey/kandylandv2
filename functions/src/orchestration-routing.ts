import {readString} from "./orchestration-utils.js"
import type {OrchestrationDomain, OrchestrationSourceCollection} from "./orchestration-contract.js"

function eventNameFromSource(
  sourceCollection: OrchestrationSourceCollection,
  sourceData: Record<string, unknown>,
) {
  if (sourceCollection === "analytics_event_facts") {
    return readString(sourceData.eventName) || "analytics_event_observed"
  }
  if (sourceCollection === "analytics_guest_batches") {
    return "guest_batch_received"
  }
  if (sourceCollection === "analytics_watch_sessions") {
    return readString(sourceData.isClosed) === "true" || sourceData.isClosed === true
      ? "watch_session_closed"
      : "watch_session_observed"
  }
  if (sourceCollection === "analytics_watch_assets") {
    return readString(sourceData.isCompleted) === "true" || sourceData.isCompleted === true
      ? "watch_asset_completed"
      : "watch_asset_observed"
  }
  if (sourceCollection === "daily_task_events") {
    const type = readString(sourceData.type) || "observed"
    return `daily_task_${type}`
  }
  if (sourceCollection === "security_events") {
    return readString(sourceData.type) || "security_signal_observed"
  }
  if (sourceCollection === "transactions") {
    return readString(sourceData.type) || "transaction_observed"
  }
  if (sourceCollection === "creator_relationships") {
    if (sourceData.following === true) {
      return "creator_following_active"
    }
    if (sourceData.favorited === true) {
      return "creator_favorite_active"
    }
    return "creator_relationship_updated"
  }
  if (sourceCollection === "creator_subscriptions") {
    return readString(sourceData.status) || "creator_subscription_updated"
  }
  if (sourceCollection === "creator_messages") {
    return readString(sourceData.messageKind) === "text" ? "creator_text_message" : "creator_media_message"
  }
  if (sourceCollection === "creator_broadcasts") {
    return "creator_broadcast_published"
  }
  if (sourceCollection === "creator_custom_requests") {
    return readString(sourceData.status) || "creator_request_updated"
  }
  if (sourceCollection === "creator_call_bookings") {
    return readString(sourceData.status) || "creator_booking_updated"
  }
  if (sourceCollection === "creator_ledger_accruals") {
    return "creator_ledger_accrual_created"
  }
  if (sourceCollection === "creator_payout_requests") {
    return readString(sourceData.status) || "creator_payout_request_updated"
  }
  return readString(sourceData.type) || "notification_updated"
}

function classifyDomain(
  sourceCollection: OrchestrationSourceCollection,
  normalizedEventName: string,
): OrchestrationDomain {
  if (sourceCollection === "analytics_event_facts" || sourceCollection === "analytics_guest_batches") {
    return "telemetry"
  }
  if (sourceCollection === "analytics_watch_sessions" || sourceCollection === "analytics_watch_assets") {
    return "watch_time"
  }
  if (sourceCollection === "daily_task_events") {
    return "tasks"
  }
  if (sourceCollection === "security_events") {
    return "security"
  }
  if (sourceCollection === "transactions" || sourceCollection === "creator_ledger_accruals") {
    return "commerce"
  }
  if (sourceCollection === "notifications") {
    return "notifications"
  }
  if (normalizedEventName.startsWith("creator_")) {
    return normalizedEventName.includes("broadcast") ? "notifications" : "creator"
  }
  return "operations"
}

function classifySystemKey(
  sourceCollection: OrchestrationSourceCollection,
  normalizedEventName: string,
) {
  if (sourceCollection === "analytics_event_facts") {
    if (normalizedEventName.startsWith("viewer_")) {
      return "viewer_telemetry"
    }
    if (normalizedEventName.startsWith("creator_")) {
      return "creator_telemetry"
    }
    if (normalizedEventName.startsWith("guided_onboarding") || normalizedEventName.startsWith("onboarding_")) {
      return "onboarding_telemetry"
    }
    if (normalizedEventName.startsWith("admin_")) {
      return "admin_telemetry"
    }
    return "identified_telemetry"
  }
  if (sourceCollection === "analytics_guest_batches") {
    return "guest_telemetry"
  }
  if (sourceCollection === "analytics_watch_sessions" || sourceCollection === "analytics_watch_assets") {
    return "watch_engine"
  }
  if (sourceCollection === "daily_task_events") {
    return "task_engine"
  }
  if (sourceCollection === "security_events") {
    return "security_engine"
  }
  if (sourceCollection === "transactions") {
    return "gumdrop_ledger"
  }
  if (sourceCollection === "creator_relationships") {
    return "creator_relationships"
  }
  if (sourceCollection === "creator_subscriptions") {
    return "creator_subscriptions"
  }
  if (sourceCollection === "creator_messages") {
    return "creator_messaging"
  }
  if (sourceCollection === "creator_broadcasts") {
    return "creator_broadcasts"
  }
  if (sourceCollection === "creator_custom_requests") {
    return "creator_requests"
  }
  if (sourceCollection === "creator_call_bookings") {
    return "creator_bookings"
  }
  if (sourceCollection === "creator_ledger_accruals") {
    return "creator_ledger"
  }
  if (sourceCollection === "creator_payout_requests") {
    return "creator_payouts"
  }
  return "notification_inbox"
}

function toLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match: string) => match.toUpperCase())
}

export function classifyOrchestrationSource(
  sourceCollection: OrchestrationSourceCollection,
  sourceData: Record<string, unknown>,
) {
  const normalizedEventName = eventNameFromSource(sourceCollection, sourceData)
  return {
    normalizedEventName,
    normalizedLabel: toLabel(normalizedEventName),
    domain: classifyDomain(sourceCollection, normalizedEventName),
    systemKey: classifySystemKey(sourceCollection, normalizedEventName),
  }
}
