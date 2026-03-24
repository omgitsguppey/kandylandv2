import {db} from "./firebase-admin.js"
import type {OrchestrationActorOwnership, OrchestrationActorType} from "./orchestration-contract.js"
import {asRecord, buildSourceDocumentKey, deriveSurface, readString} from "./orchestration-utils.js"

function readActorId(sourceCollection: string, sourceData: Record<string, unknown>) {
  const explicitActorId = readString(sourceData.actorId) ||
    readString(sourceData.initiatedBy) ||
    readString(sourceData.sentBy)
  if (explicitActorId) {
    return explicitActorId
  }

  if (sourceCollection === "analytics_guest_batches") {
    return ""
  }

  return readString(sourceData.creatorId) ||
    readString(sourceData.userId) ||
    readString(sourceData.uid) ||
    readString(sourceData.targetUserId)
}

function readCreatorContext(sourceData: Record<string, unknown>) {
  return readString(sourceData.creatorId) ||
    readString(sourceData.targetCreatorId) ||
    readString(sourceData.relatedCreatorId)
}

function readRoutePath(sourceData: Record<string, unknown>) {
  return readString(sourceData.pagePath) ||
    readString(sourceData.currentPath) ||
    readString(sourceData.routePath) ||
    readString(sourceData.path) ||
    readString(sourceData.destination)
}

function readSessionKey(sourceData: Record<string, unknown>, fallbackActorId: string) {
  return readString(sourceData.watchSessionId) ||
    readString(sourceData.sessionId) ||
    readString(sourceData.clientSessionId) ||
    readString(sourceData.sessionKey) ||
    (fallbackActorId ? `actor:${fallbackActorId}` : "guest")
}

function buildActorKey(actorType: OrchestrationActorType, actorId: string) {
  return `${actorType}:${actorId || "anonymous"}`
}

export async function resolveOrchestrationIdentity(input: {
  sourceCollection: string
  sourceDocumentPath: string
  sourceData: Record<string, unknown>
}) {
  const fallbackObservations: string[] = []
  const missingDependencies = new Set<string>()
  const readyDependencies = new Set<string>()
  const actorId = readActorId(input.sourceCollection, input.sourceData)
  const creatorContextId = readCreatorContext(input.sourceData) || null
  const routePath = readRoutePath(input.sourceData)
  const sourceSurface = deriveSurface(routePath)
  const sessionKey = readSessionKey(input.sourceData, actorId)

  if (routePath) {
    readyDependencies.add("route")
  } else {
    missingDependencies.add("route")
    fallbackObservations.push("Route context was inferred from source defaults.")
  }

  if (sessionKey && sessionKey !== "guest") {
    readyDependencies.add("session")
  } else {
    missingDependencies.add("session")
    fallbackObservations.push("Session ownership fell back to an anonymous session key.")
  }

  let actorType: OrchestrationActorType = "system"
  let actorLabel = "System"
  let contaminationRisk = false

  if (!actorId) {
    actorType = input.sourceCollection === "analytics_guest_batches" ? "guest" : "system"
    actorLabel = actorType === "guest" ? "Guest visitor" : "System process"
    readyDependencies.add("actor")
  } else {
    readyDependencies.add("actor")
    const userSnap = await db.collection("users").doc(actorId).get()
    const userData = userSnap.exists ? asRecord(userSnap.data()) : {}
    const role = readString(userData.role)
    actorType = role === "admin" ? "admin" : role === "creator" ? "creator" : "user"
    actorLabel = readString(userData.displayName) || readString(userData.username) || actorId
  }

  if (creatorContextId) {
    readyDependencies.add("creator_context")
  } else if (input.sourceCollection.startsWith("creator_")) {
    missingDependencies.add("creator_context")
  }

  const actorKey = buildActorKey(actorType, actorId)
  const sessionRef = db.collection("orchestration_session_ownership").doc(buildSourceDocumentKey(sessionKey))
  const sessionSnap = await sessionRef.get()
  if (sessionSnap.exists) {
    const existing = asRecord(sessionSnap.data())
    const existingActorKey = readString(existing.actorKey)
    if (existingActorKey && existingActorKey !== actorKey) {
      contaminationRisk = true
      fallbackObservations.push("Session ownership previously mapped to another actor.")
    }
  }

  const actor: OrchestrationActorOwnership = {
    actorType,
    actorId,
    actorLabel,
    actorKey,
    creatorContextId,
    creatorContextLabel: creatorContextId,
    projectContext: "kandydrops",
    contaminationRisk,
  }

  return {
    actor,
    session: {
      sessionKey,
      sourceSurface,
      routePath,
    },
    dependencyReadiness: {
      ready: Array.from(readyDependencies),
      missing: Array.from(missingDependencies),
    },
    fallbackObservations,
  }
}
