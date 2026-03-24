import {readBoolean, readString} from "./orchestration-utils.js"
import type {OrchestrationActorType, OrchestrationDomain, OrchestrationReadinessTags} from "./orchestration-contract.js"

export function buildOrchestrationReadiness(input: {
  sourceCollection: string
  sourceData: Record<string, unknown>
  domain: OrchestrationDomain
  actorType: OrchestrationActorType
  creatorContextId: string | null
  dependencyMissing: string[]
}) {
  const trainingBlockedReasons: string[] = []
  const recommendationBlockedReasons: string[] = []
  const missing = new Set(input.dependencyMissing)
  const isModerationBlocked = readBoolean(input.sourceData.removedAt) ||
    readBoolean(input.sourceData.isRemoved) ||
    readBoolean(input.sourceData.moderationBlocked)

  if (input.actorType === "admin" || input.actorType === "system") {
    trainingBlockedReasons.push("administrative_or_system_signal")
    recommendationBlockedReasons.push("administrative_or_system_signal")
  }

  if (input.domain === "security") {
    trainingBlockedReasons.push("security_signal")
    recommendationBlockedReasons.push("security_signal")
  }

  if (missing.size > 0) {
    if (missing.has("actor")) {
      trainingBlockedReasons.push("missing_actor")
      recommendationBlockedReasons.push("missing_actor")
    }
    if (missing.has("session")) {
      trainingBlockedReasons.push("missing_session")
    }
    if (missing.has("route")) {
      recommendationBlockedReasons.push("missing_route")
    }
    if (missing.has("creator_context")) {
      trainingBlockedReasons.push("missing_creator_context")
      recommendationBlockedReasons.push("missing_creator_context")
    }
  }

  if (isModerationBlocked) {
    trainingBlockedReasons.push("moderation_blocked")
  }

  const creatorChatTrainingEligible = input.sourceCollection === "creator_messages"
    && input.actorType !== "admin"
    && !isModerationBlocked
    && trainingBlockedReasons.length === 0
  const creatorLikenessEligible = Boolean(input.creatorContextId)
    && (input.domain === "watch_time" || readString(input.sourceData.type) === "unlock_content" || readString(input.sourceData.eventName) === "creator_drop_unwrapped")
    && !isModerationBlocked
  const trainingEligible = trainingBlockedReasons.length === 0 && (
    input.domain === "telemetry" ||
    input.domain === "watch_time" ||
    input.domain === "tasks" ||
    input.domain === "commerce" ||
    input.domain === "creator"
  )
  const recommendationReady = recommendationBlockedReasons.length === 0 && (
    input.domain === "telemetry" ||
    input.domain === "watch_time" ||
    input.domain === "creator" ||
    input.domain === "commerce" ||
    input.domain === "tasks"
  )

  const readiness: OrchestrationReadinessTags = {
    trainingEligible,
    trainingBlockedReasons,
    recommendationReady,
    recommendationBlockedReasons,
    creatorLikenessEligible,
    creatorChatTrainingEligible,
    lowConfidence: missing.size > 0 || input.actorType === "guest",
    incomplete: missing.size > 0,
  }

  return readiness
}
