import {shouldSkipScheduledWork} from "./maintenance-mode.js"

/**
 * Keep the maintenance decision ahead of the callback that may import or
 * invoke Firestore, BigQuery, Cloud SQL, messaging, or other paid work.
 * The callback is deliberately injected so the boundary is locally testable
 * without initializing Firebase Admin or querying production data.
 */
export async function runIfMaintenanceAllows<T>(work: () => Promise<T>): Promise<T | undefined> {
  if (shouldSkipScheduledWork()) return undefined
  return work()
}
