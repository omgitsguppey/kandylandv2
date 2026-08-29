import {
  isMaintenanceStateActive,
  MAINTENANCE_MODE_ENV,
  resolveMaintenanceModeState,
  type MaintenanceModeState,
} from "../../shared/runtime/maintenance-mode-contract.js"

export {MAINTENANCE_MODE_ENV, resolveMaintenanceModeState} from "../../shared/runtime/maintenance-mode-contract.js"
export type {MaintenanceModeState} from "../../shared/runtime/maintenance-mode-contract.js"

export function getMaintenanceModeState(): MaintenanceModeState {
  return resolveMaintenanceModeState(process.env[MAINTENANCE_MODE_ENV])
}

/**
 * Scheduled functions do not inherit App Hosting's environment automatically.
 * The deployment environment must set KANDY_MAINTENANCE_MODE=1 while the
 * maintenance contract is active. Missing or ambiguous configuration fails
 * closed so background work cannot start accidentally. Cloud Scheduler must
 * still be paused separately.
 */
export function isMaintenanceModeEnabled(): boolean {
  return isMaintenanceStateActive(getMaintenanceModeState())
}

export function shouldSkipScheduledWork(): boolean {
  return isMaintenanceModeEnabled()
}
