import {setGlobalOptions} from "firebase-functions/v2"

import {REGION} from "./firebase-runtime.js"

export {onAnalyticsEventFactCreated} from "./analytics-event-facts.js"
export {
  onAnalyticsEventFactOrchestrated,
  onCreatorBookingOrchestrated,
  onCreatorBroadcastOrchestrated,
  onCreatorLedgerAccrualOrchestrated,
  onCreatorMessageOrchestrated,
  onCreatorPayoutRequestOrchestrated,
  onCreatorRelationshipOrchestrated,
  onCreatorRequestOrchestrated,
  onCreatorSubscriptionOrchestrated,
  onDailyTaskEventOrchestrated,
  onGuestAnalyticsBatchOrchestrated,
  onNotificationOrchestrated,
  onOrchestrationRepairActionCreated,
  onSecurityEventOrchestrated,
  onTransactionOrchestrated,
  onWatchAssetOrchestrated,
  onWatchSessionOrchestrated,
} from "./orchestration-engine.js"
export {onGuestAnalyticsBatchCreated} from "./analytics-guest-batches.js"
export {onDailyTaskEventCreated} from "./analytics-task-events.js"
export {onSecurityEventCreated} from "./analytics-security-events.js"
export {onTransactionCreated} from "./analytics-transactions.js"

setGlobalOptions({
  region: REGION,
  maxInstances: 10,
})
