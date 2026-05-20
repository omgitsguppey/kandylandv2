import { getRegisteredRefreshCommand } from "./refresh-registry";

export type FreshnessRefreshAction = {
  reportPath: string;
  command: string | null;
  actionLabel: string;
  actionDetail: string;
};

const REFRESH_COMMANDS: Array<[string, string]> = [
  ["public-beta-score.generated.json", "npm run score:beta && npm run check:beta-score"],
  ["current-beta-exit-status.generated.json", "npm run check:current-beta-exit-status"],
  ["evidence-capture-status.generated.json", "npm run check:evidence-capture-status"],
  ["source-truth-authority-map.generated.json", "npm run check:source-truth-authority-map"],
  ["final-cost-audit-lock.generated.json", "npm run check:final-cost-audit-lock"],
  ["creator-dashboard-role-boundary.generated.json", "npm run check:creator-dashboard-role-boundary"],
  ["creator-fan-pass-crm-broadcast.generated.json", "npm run check:creator-fan-pass-crm-broadcast"],
  ["creator-dashboard-overview-stats.generated.json", "npm run check:creator-dashboard-overview-stats"],
  ["beta-health-algorithm-v2.generated.json", "npm run check:beta-health-algorithm-v2"],
];

export function getRefreshCommandForReport(reportPath: string): FreshnessRefreshAction {
  const normalized = reportPath.replace(/\\/gu, "/");
  const registered = getRegisteredRefreshCommand(normalized);
  if (registered) {
    return {
      reportPath,
      command: registered,
      actionLabel: "Refresh report",
      actionDetail: `Run ${registered} from the latest code version.`,
    };
  }

  const match = REFRESH_COMMANDS.find(([name]) => normalized.endsWith(name));
  if (!match) {
    return {
      reportPath,
      command: null,
      actionLabel: "Find validator",
      actionDetail: "No refresh command is registered for this report yet.",
    };
  }

  const [, command] = match;
  return {
    reportPath,
    command,
    actionLabel: "Refresh report",
    actionDetail: `Run ${command} from the latest code version.`,
  };
}

export function buildFreshnessActionList(reports: string[]): FreshnessRefreshAction[] {
  return reports.map((reportPath) => getRefreshCommandForReport(reportPath));
}
