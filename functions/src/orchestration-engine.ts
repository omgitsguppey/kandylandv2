import {onDocumentCreated, onDocumentWritten} from "firebase-functions/v2/firestore"

import {db} from "./firebase-admin.js"
import {REGION} from "./firebase-runtime.js"
import {
  ORCHESTRATION_COLLECTIONS,
  type OrchestrationSourceCollection,
} from "./orchestration-contract.js"
import {recordOrchestrationDiagnostic} from "./orchestration-diagnostics.js"
import {safelyOrchestrateSourceMutation} from "./orchestration-runtime.js"
import {asRecord, buildSourceDocumentKey, readString} from "./orchestration-utils.js"

function buildCreateHandler(sourceCollection: OrchestrationSourceCollection, path: string) {
  return onDocumentCreated({document: path, region: REGION}, async (event) => {
    const snapshot = event.data
    const data = snapshot?.data()
    if (!snapshot || !data) {
      return
    }

    await safelyOrchestrateSourceMutation({
      sourceCollection,
      sourceDocumentId: snapshot.ref.id,
      sourceDocumentPath: snapshot.ref.path,
      sourceMutation: "create",
      sourceData: asRecord(data),
    })
  })
}

function buildWriteHandler(sourceCollection: OrchestrationSourceCollection, path: string) {
  return onDocumentWritten({document: path, region: REGION}, async (event) => {
    const afterData = event.data?.after.data()
    const beforeData = event.data?.before.data()
    if (!afterData && !beforeData) {
      return
    }

    const sourceMutation = !beforeData ? "create" : !afterData ? "delete" : "update"
    const ref = event.data?.after.ref || event.data?.before.ref
    if (!ref) {
      return
    }

    await safelyOrchestrateSourceMutation({
      sourceCollection,
      sourceDocumentId: ref.id,
      sourceDocumentPath: ref.path,
      sourceMutation,
      sourceData: asRecord(afterData || beforeData),
    })
  })
}

export const onAnalyticsEventFactOrchestrated = buildCreateHandler(
  "analytics_event_facts",
  "analytics_event_facts/{eventId}",
)

export const onGuestAnalyticsBatchOrchestrated = buildCreateHandler(
  "analytics_guest_batches",
  "analytics_guest_batches/{batchId}",
)

export const onWatchSessionOrchestrated = buildWriteHandler(
  "analytics_watch_sessions",
  "analytics_watch_sessions/{watchSessionId}",
)

export const onWatchAssetOrchestrated = buildWriteHandler(
  "analytics_watch_assets",
  "analytics_watch_assets/{watchAssetId}",
)

export const onDailyTaskEventOrchestrated = buildCreateHandler(
  "daily_task_events",
  "daily_task_events/{eventId}",
)

export const onSecurityEventOrchestrated = buildCreateHandler(
  "security_events",
  "security_events/{eventId}",
)

export const onTransactionOrchestrated = buildCreateHandler(
  "transactions",
  "transactions/{transactionId}",
)

export const onCreatorRelationshipOrchestrated = buildWriteHandler(
  "creator_relationships",
  "creator_relationships/{relationshipId}",
)

export const onCreatorSubscriptionOrchestrated = buildWriteHandler(
  "creator_subscriptions",
  "creator_subscriptions/{subscriptionId}",
)

export const onCreatorMessageOrchestrated = buildWriteHandler(
  "creator_messages",
  "creator_messages/{messageId}",
)

export const onCreatorBroadcastOrchestrated = buildWriteHandler(
  "creator_broadcasts",
  "creator_broadcasts/{broadcastId}",
)

export const onCreatorRequestOrchestrated = buildWriteHandler(
  "creator_custom_requests",
  "creator_custom_requests/{requestId}",
)

export const onCreatorBookingOrchestrated = buildWriteHandler(
  "creator_call_bookings",
  "creator_call_bookings/{bookingId}",
)

export const onCreatorLedgerAccrualOrchestrated = buildCreateHandler(
  "creator_ledger_accruals",
  "creator_ledger_accruals/{accrualId}",
)

export const onCreatorPayoutRequestOrchestrated = buildWriteHandler(
  "creator_payout_requests",
  "creator_payout_requests/{payoutRequestId}",
)

export const onNotificationOrchestrated = buildWriteHandler(
  "notifications",
  "notifications/{notificationId}",
)

export const onOrchestrationRepairActionCreated = onDocumentCreated(
  {document: `${ORCHESTRATION_COLLECTIONS.repairActions}/{repairActionId}`, region: REGION},
  async (event) => {
    const repairActionId = event.params.repairActionId as string
    const repairActionData = asRecord(event.data?.data())
    const sourceCollection = readString(repairActionData.sourceCollection) as OrchestrationSourceCollection
    const sourceDocumentPath = readString(repairActionData.sourceDocumentPath)
    const sourceDocumentKey = readString(repairActionData.sourceDocumentKey) || buildSourceDocumentKey(sourceDocumentPath)
    const proposalId = readString(repairActionData.proposalId)
    const findingKey = readString(repairActionData.findingKey)
    const repairActionRef = db.collection(ORCHESTRATION_COLLECTIONS.repairActions).doc(repairActionId)

    if (!sourceCollection || !sourceDocumentPath) {
      await repairActionRef.set({
        status: "failed",
        resultSummary: "Repair action is missing source collection or source path.",
        appliedAtMs: Date.now(),
      }, {merge: true})
      return
    }

    try {
      const sourceSnap = await db.doc(sourceDocumentPath).get()
      if (!sourceSnap.exists) {
        await repairActionRef.set({
          status: "failed",
          resultSummary: "Source record no longer exists.",
          appliedAtMs: Date.now(),
        }, {merge: true})
        return
      }

      await safelyOrchestrateSourceMutation({
        sourceCollection,
        sourceDocumentId: sourceSnap.id,
        sourceDocumentPath: sourceSnap.ref.path,
        sourceMutation: "repair",
        sourceData: asRecord(sourceSnap.data()),
      })

      const findingsSnap = await db.collection(ORCHESTRATION_COLLECTIONS.findings)
        .where("sourceDocumentKey", "==", sourceDocumentKey)
        .get()
      const openFindings = findingsSnap.docs
        .map((doc) => asRecord(doc.data()))
        .filter((doc) => readString(doc.status) === "open")
      const findingStillOpen = openFindings.some((doc) => readString(doc.findingKey) === findingKey)
      const nowMs = Date.now()

      await Promise.all([
        repairActionRef.set({
          status: findingStillOpen ? "reviewed_no_change" : "applied",
          appliedAtMs: nowMs,
          resultSummary: findingStillOpen
            ? "Projection was rebuilt, but the source mismatch is still present."
            : "Projection rebuilt and the mismatch is no longer open.",
        }, {merge: true}),
        proposalId
          ? db.collection(ORCHESTRATION_COLLECTIONS.repairProposals).doc(proposalId).set({
            status: findingStillOpen ? "reviewed_no_change" : "resolved",
            updatedAtMs: nowMs,
          }, {merge: true})
          : Promise.resolve(),
        findingKey
          ? db.collection(ORCHESTRATION_COLLECTIONS.findings).doc(`${sourceDocumentKey}_${findingKey}`).set({
            status: findingStillOpen ? "reviewed_no_change" : "resolved",
            updatedAtMs: nowMs,
          }, {merge: true})
          : Promise.resolve(),
      ])
    } catch (error) {
      await Promise.all([
        repairActionRef.set({
          status: "failed",
          appliedAtMs: Date.now(),
          resultSummary: error instanceof Error ? error.message : String(error),
        }, {merge: true}),
        recordOrchestrationDiagnostic({
          severity: "error",
          message: "Orchestration repair action failed",
          detail: {
            repairActionId,
            sourceCollection,
            sourceDocumentPath,
            error: error instanceof Error ? error.message : String(error),
          },
        }),
      ])
      throw error
    }
  },
)
