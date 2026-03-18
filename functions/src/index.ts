import {setGlobalOptions} from "firebase-functions/v2"

import {REGION} from "./firebase-runtime.js"

export {onAnalyticsEventFactCreated} from "./analytics-event-facts.js"
export {onGuestAnalyticsBatchCreated} from "./analytics-guest-batches.js"
export {onDailyTaskEventCreated} from "./analytics-task-events.js"
export {onSecurityEventCreated} from "./analytics-security-events.js"
export {onTransactionCreated} from "./analytics-transactions.js"
export {
  detectAnalyticsAnomaliesHourly,
  materializeAnalyticsWindow15m,
  materializeAnalyticsWindow24h,
  materializeCommerceEconomicsHourly,
  materializeDropAnalyticsHourly,
  materializeUserAnalyticsDaily,
  materializeUserEconomicsLeaderboardHourly,
  refreshRealtimeAnalytics,
} from "./analytics-schedules.js"

setGlobalOptions({
  region: REGION,
  maxInstances: 10,
})
