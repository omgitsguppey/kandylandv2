import {readFileSync} from "node:fs";
import path from "node:path";

import {describe, expect, it} from "vitest";

const REQUIRED_EXPORT_MUTATIONS = [
  "UpsertAnalyticsExportStatus",
  "UpsertAnalyticsPageDaily",
  "UpsertAnalyticsDropDaily",
  "UpsertAnalyticsUserDaily",
  "UpsertAnalyticsUserRollup",
  "UpsertAnalyticsCommerceDaily",
  "UpsertAnalyticsCommerceRollup",
  "UpsertAnalyticsBundleDaily",
  "UpsertAnalyticsTaskDaily",
  "UpsertAnalyticsTaskRollup",
  "UpsertAnalyticsSecurityDaily",
  "UpsertAnalyticsUserSecurityRollup",
  "UpsertAnalyticsAlert",
  "DeleteAnalyticsPageDaily",
  "DeleteAnalyticsDropDaily",
  "DeleteAnalyticsUserDaily",
  "DeleteAnalyticsUserRollup",
  "DeleteAnalyticsCommerceDaily",
  "DeleteAnalyticsCommerceRollup",
  "DeleteAnalyticsBundleDaily",
  "DeleteAnalyticsTaskDaily",
  "DeleteAnalyticsTaskRollup",
  "DeleteAnalyticsSecurityDaily",
  "DeleteAnalyticsUserSecurityRollup",
  "DeleteAnalyticsAlert",
];

const REQUIRED_EXPORT_QUERIES = [
  "GetAnalyticsExportStatuses",
  "ListAnalyticsExportCommerceDaily",
  "GetAnalyticsExportCommerceRollup",
  "ListAnalyticsExportBundleDaily",
  "GetAnalyticsExportTopPagesByDay",
  "GetAnalyticsExportTopDropsByDay",
  "GetAnalyticsExportTopUsersByDay",
  "GetAnalyticsExportTopUsersAllTime",
  "ListAnalyticsExportTaskDaily",
  "GetAnalyticsExportTopTasks",
  "ListAnalyticsExportSecurityDaily",
  "GetAnalyticsExportTopUserSecurity",
  "ListAnalyticsExportAlerts",
  "ListAnalyticsExportAlertsByHourKey",
];

describe("analytics export contracts", () => {
  const mutationsSource = readFileSync(
    path.resolve(process.cwd(), "dataconnect/analytics_export/mutations.gql"),
    "utf8",
  );
  const queriesSource = readFileSync(
    path.resolve(process.cwd(), "dataconnect/analytics_export/queries.gql"),
    "utf8",
  );
  const schemaSource = readFileSync(
    path.resolve(process.cwd(), "dataconnect/schema/schema.gql"),
    "utf8",
  );
  const functionsIndexSource = readFileSync(
    path.resolve(process.cwd(), "functions/src/index.ts"),
    "utf8",
  );

  it("defines a dedicated export status table", () => {
    expect(schemaSource).toContain("type AnalyticsExportStatus @table");
  });

  it("keeps the analytics export connector mutations complete", () => {
    REQUIRED_EXPORT_MUTATIONS.forEach((operationName) => {
      expect(mutationsSource).toContain(`mutation ${operationName}`);
    });
  });

  it("keeps the analytics export connector queries complete", () => {
    REQUIRED_EXPORT_QUERIES.forEach((operationName) => {
      expect(queriesSource).toContain(`query ${operationName}`);
    });
  });

  it("exports the rollup sync functions from the Functions entrypoint", () => {
    [
      "onAnalyticsAlertsExportMirror",
      "onAnalyticsBundleDailyExportSync",
      "onAnalyticsCommerceDailyExportSync",
      "onAnalyticsCommerceRollupExportSync",
      "onAnalyticsDropDailyExportSync",
      "onAnalyticsPageDailyExportSync",
      "onAnalyticsSecurityDailyExportSync",
      "onAnalyticsTaskDailyExportSync",
      "onAnalyticsTaskRollupExportSync",
      "onAnalyticsUserDailyExportSync",
      "onAnalyticsUserRollupExportSync",
      "onAnalyticsUserSecurityRollupExportSync",
    ].forEach((exportName) => {
      expect(functionsIndexSource).toContain(exportName);
    });
  });
});
