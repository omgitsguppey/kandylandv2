import {FieldValue} from "firebase-admin/firestore"

import {db} from "./firebase-admin.js"
import {
  ORCHESTRATION_COLLECTIONS,
  ORCHESTRATION_ENGINE_VERSION,
  type OrchestrationFindingRecord,
  type OrchestrationRecordStatus,
  type OrchestrationSourceCollection,
  type OrchestrationSourceMutation,
} from "./orchestration-contract.js"
import {recordOrchestrationDiagnostic} from "./orchestration-diagnostics.js"
import {resolveOrchestrationIdentity} from "./orchestration-identity.js"
import {evaluateParity} from "./orchestration-parity.js"
import {buildOrchestrationReadiness} from "./orchestration-readiness.js"
import {classifyOrchestrationSource} from "./orchestration-routing.js"
import {asRecord, buildSourceDocumentKey, readString, readTimestampMillis} from "./orchestration-utils.js"

function resolveOccurredAt(sourceCollection: OrchestrationSourceCollection, sourceData: Record<string, unknown>) {
  if (sourceCollection === "analytics_guest_batches") {
    return readTimestampMillis(sourceData.receivedAtMs || sourceData.createdAt) || Date.now()
  }

  return readTimestampMillis(sourceData.timestampMs) ||
    readTimestampMillis(sourceData.timestamp) ||
    readTimestampMillis(sourceData.createdAtMs) ||
    readTimestampMillis(sourceData.createdAt) ||
    readTimestampMillis(sourceData.updatedAtMs) ||
    readTimestampMillis(sourceData.updatedAt) ||
    Date.now()
}

function resolveStatus(findings: OrchestrationFindingRecord[], sourceMutation: OrchestrationSourceMutation): OrchestrationRecordStatus {
  if (findings.some((entry) => entry.severity === "error")) {
    return "critical"
  }
  if (findings.some((entry) => entry.severity === "warn")) {
    return "attention"
  }
  if (sourceMutation === "repair" || sourceMutation === "delete") {
    return "observing"
  }
  return "healthy"
}

function buildHumanSummary(input: {
  normalizedLabel: string
  actorLabel: string
  sourceSurface: string
  domain: string
  findingCount: number
}) {
  const base = `${input.normalizedLabel} observed for ${input.actorLabel || "an unknown actor"} on ${input.sourceSurface}.`
  if (input.findingCount === 0) {
    return `${base} No orchestration mismatches are open right now.`
  }
  return `${base} ${input.findingCount} orchestration mismatch${input.findingCount === 1 ? "" : "es"} need attention.`
}

function buildExplanation(input: {
  domain: string
  systemKey: string
  dependencyMissing: string[]
  readinessBlocked: string[]
  fallbackObservations: string[]
}) {
  const parts = [
    `Observed inside the ${input.domain} domain through ${input.systemKey}.`,
  ]
  if (input.dependencyMissing.length > 0) {
    parts.push(`Missing dependency context: ${input.dependencyMissing.join(", ")}.`)
  }
  if (input.readinessBlocked.length > 0) {
    parts.push(`ML/recommendation readiness is currently blocked by ${input.readinessBlocked.join(", ")}.`)
  }
  if (input.fallbackObservations.length > 0) {
    parts.push(`Fallbacks used: ${input.fallbackObservations.join(" ")}`)
  }
  return parts.join(" ")
}

function buildFindingDocumentId(sourceDocumentKey: string, findingKey: string) {
  return `${sourceDocumentKey}_${findingKey}`
}

async function reconcileResolvedRecords(input: {
  sourceDocumentKey: string
  activeFindingKeys: Set<string>
  nowMs: number
}) {
  const [existingFindingsSnap, existingProposalsSnap] = await Promise.all([
    db.collection(ORCHESTRATION_COLLECTIONS.findings)
      .where("sourceDocumentKey", "==", input.sourceDocumentKey)
      .get(),
    db.collection(ORCHESTRATION_COLLECTIONS.repairProposals)
      .where("sourceDocumentKey", "==", input.sourceDocumentKey)
      .get(),
  ])

  const batch = db.batch()

  existingFindingsSnap.docs.forEach((doc) => {
    const data = asRecord(doc.data())
    const findingKey = readString(data.findingKey)
    const status = readString(data.status)
    if (!input.activeFindingKeys.has(findingKey) && status !== "dismissed" && status !== "resolved") {
      batch.set(doc.ref, {
        status: "resolved",
        updatedAtMs: input.nowMs,
      }, {merge: true})
    }
  })

  existingProposalsSnap.docs.forEach((doc) => {
    const data = asRecord(doc.data())
    const findingKey = readString(data.findingKey)
    const status = readString(data.status)
    if (!input.activeFindingKeys.has(findingKey) && status !== "dismissed" && status !== "resolved") {
      batch.set(doc.ref, {
        status: "resolved",
        updatedAtMs: input.nowMs,
      }, {merge: true})
    }
  })

  await batch.commit()
}

export async function orchestrateSourceMutation(input: {
  sourceCollection: OrchestrationSourceCollection
  sourceDocumentId: string
  sourceDocumentPath: string
  sourceMutation: OrchestrationSourceMutation
  sourceData: Record<string, unknown>
}) {
  const observedAtMs = Date.now()
  const occurredAtMs = resolveOccurredAt(input.sourceCollection, input.sourceData)
  const sourceDocumentKey = buildSourceDocumentKey(input.sourceDocumentPath)
  const routed = classifyOrchestrationSource(input.sourceCollection, input.sourceData)
  const identity = await resolveOrchestrationIdentity({
    sourceCollection: input.sourceCollection,
    sourceDocumentPath: input.sourceDocumentPath,
    sourceData: input.sourceData,
  })
  const findings = evaluateParity({
    sourceCollection: input.sourceCollection,
    sourceData: input.sourceData,
    normalizedEventName: routed.normalizedEventName,
    routePath: identity.session.routePath,
    actorId: identity.actor.actorId,
    creatorContextId: identity.actor.creatorContextId,
    contaminationRisk: identity.actor.contaminationRisk,
    sourceMutation: input.sourceMutation,
  })
  const readiness = buildOrchestrationReadiness({
    sourceCollection: input.sourceCollection,
    sourceData: input.sourceData,
    domain: routed.domain,
    actorType: identity.actor.actorType,
    creatorContextId: identity.actor.creatorContextId,
    dependencyMissing: identity.dependencyReadiness.missing,
  })
  const status = resolveStatus(findings, input.sourceMutation)
  const humanSummary = buildHumanSummary({
    normalizedLabel: routed.normalizedLabel,
    actorLabel: identity.actor.actorLabel,
    sourceSurface: identity.session.sourceSurface,
    domain: routed.domain,
    findingCount: findings.length,
  })
  const explanation = buildExplanation({
    domain: routed.domain,
    systemKey: routed.systemKey,
    dependencyMissing: identity.dependencyReadiness.missing,
    readinessBlocked: Array.from(new Set([
      ...readiness.trainingBlockedReasons,
      ...readiness.recommendationBlockedReasons,
    ])),
    fallbackObservations: identity.fallbackObservations,
  })

  const eventRef = db.collection(ORCHESTRATION_COLLECTIONS.events).doc()
  const activeFindingKeys = new Set(findings.map((entry) => entry.findingKey))
  const batch = db.batch()

  batch.set(eventRef, {
    engineVersion: ORCHESTRATION_ENGINE_VERSION,
    sourceCollection: input.sourceCollection,
    sourceDocumentId: input.sourceDocumentId,
    sourceDocumentPath: input.sourceDocumentPath,
    sourceDocumentKey,
    sourceMutation: input.sourceMutation,
    domain: routed.domain,
    systemKey: routed.systemKey,
    normalizedEventName: routed.normalizedEventName,
    normalizedLabel: routed.normalizedLabel,
    humanSummary,
    explanation,
    observedAtMs,
    occurredAtMs,
    actor: identity.actor,
    session: identity.session,
    dependencyReadiness: identity.dependencyReadiness,
    fallbackObservations: identity.fallbackObservations,
    readiness,
    status,
    findingCount: findings.length,
    proposalCount: findings.length,
    createdAt: FieldValue.serverTimestamp(),
  })

  findings.forEach((finding) => {
    const findingId = buildFindingDocumentId(sourceDocumentKey, finding.findingKey)
    batch.set(db.collection(ORCHESTRATION_COLLECTIONS.findings).doc(findingId), {
      ...finding,
      sourceDocumentKey,
      sourceCollection: input.sourceCollection,
      sourceDocumentPath: input.sourceDocumentPath,
      sourceDocumentId: input.sourceDocumentId,
      domain: routed.domain,
      systemKey: routed.systemKey,
      status: "open",
      detectedAtMs: occurredAtMs,
      updatedAtMs: observedAtMs,
      actorKey: identity.actor.actorKey,
      sessionKey: identity.session.sessionKey,
      eventRecordId: eventRef.id,
    })

    batch.set(db.collection(ORCHESTRATION_COLLECTIONS.repairProposals).doc(findingId), {
      proposalKey: findingId,
      sourceDocumentKey,
      sourceCollection: input.sourceCollection,
      sourceDocumentPath: input.sourceDocumentPath,
      sourceDocumentId: input.sourceDocumentId,
      findingKey: finding.findingKey,
      status: "open",
      actionType: finding.repair.actionType,
      label: finding.repair.label,
      detail: finding.repair.detail,
      requiresAdminConfirmation: finding.repair.requiresAdminConfirmation,
      detectedAtMs: occurredAtMs,
      updatedAtMs: observedAtMs,
      eventRecordId: eventRef.id,
    })
  })

  const actorSummaryRef = db.collection(ORCHESTRATION_COLLECTIONS.actorSummaries).doc(identity.actor.actorKey)
  batch.set(actorSummaryRef, {
    actorType: identity.actor.actorType,
    actorId: identity.actor.actorId,
    actorLabel: identity.actor.actorLabel,
    creatorContextId: identity.actor.creatorContextId,
    creatorContextLabel: identity.actor.creatorContextLabel,
    lastSeenAtMs: observedAtMs,
    eventCount: FieldValue.increment(1),
    warningCount: FieldValue.increment(findings.filter((entry) => entry.severity === "warn").length),
    criticalCount: FieldValue.increment(findings.filter((entry) => entry.severity === "error").length),
    contaminationCount: FieldValue.increment(identity.actor.contaminationRisk ? 1 : 0),
    topDomains: FieldValue.arrayUnion(routed.domain),
    topSurfaces: FieldValue.arrayUnion(identity.session.sourceSurface),
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true})

  const sessionRef = db.collection(ORCHESTRATION_COLLECTIONS.sessionOwnership).doc(buildSourceDocumentKey(identity.session.sessionKey))
  batch.set(sessionRef, {
    sessionKey: identity.session.sessionKey,
    actorKey: identity.actor.actorKey,
    actorId: identity.actor.actorId,
    actorType: identity.actor.actorType,
    sourceSurface: identity.session.sourceSurface,
    routePath: identity.session.routePath,
    firstSeenAtMs: occurredAtMs,
    lastSeenAtMs: observedAtMs,
    eventCount: FieldValue.increment(1),
    contaminationCount: FieldValue.increment(identity.actor.contaminationRisk ? 1 : 0),
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true})

  await batch.commit()
  await reconcileResolvedRecords({
    sourceDocumentKey,
    activeFindingKeys,
    nowMs: observedAtMs,
  })
}

export async function safelyOrchestrateSourceMutation(input: {
  sourceCollection: OrchestrationSourceCollection
  sourceDocumentId: string
  sourceDocumentPath: string
  sourceMutation: OrchestrationSourceMutation
  sourceData: Record<string, unknown>
}) {
  try {
    await orchestrateSourceMutation(input)
  } catch (error) {
    await recordOrchestrationDiagnostic({
      severity: "error",
      message: "Behavior orchestration failed",
      detail: {
        sourceCollection: input.sourceCollection,
        sourceDocumentPath: input.sourceDocumentPath,
        sourceMutation: input.sourceMutation,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}
