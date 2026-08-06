export function isMaintenanceModeEnabled(): boolean {
  const value = process.env.KANDY_MAINTENANCE_MODE?.trim();
  return value === "1" || value?.toLowerCase() === "true";
}
