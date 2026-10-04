import {
  isMaintenanceStateActive,
  MAINTENANCE_MODE_ENV,
  resolveMaintenanceModeState,
  type MaintenanceModeState,
} from "../../shared/runtime/maintenance-mode-contract";

export { MAINTENANCE_MODE_ENV, resolveMaintenanceModeState } from "../../shared/runtime/maintenance-mode-contract";
export type { MaintenanceModeState } from "../../shared/runtime/maintenance-mode-contract";

export function getMaintenanceModeState(): MaintenanceModeState {
  return resolveMaintenanceModeState(process.env[MAINTENANCE_MODE_ENV]);
}

/** Public routing fails closed when maintenance configuration is missing or ambiguous. */
export function isMaintenanceModeEnabled(): boolean {
  return isMaintenanceStateActive(getMaintenanceModeState());
}
