import "server-only";

import { BetaAnalyticsDataClient } from "@google-analytics/data";

import { safeRunReport, type AnalyticsReportResponse } from "../admin-analytics-shared";

export type AdminAnalyticsDataClient = BetaAnalyticsDataClient;
export type AdminAnalyticsReportRequestConfig = Parameters<BetaAnalyticsDataClient["runReport"]>[0];
export type AdminAnalyticsGa4State = {
  status: "ga4_config_missing" | "ga4_client_unused" | "ga4_evidence_only";
  truthState: "unavailable" | "deferred" | "partial";
  sourceRole: "external_evidence_only";
  reason: string;
};

export function classifyAdminAnalyticsGa4State(input: {
  propertyId: string;
  allowVendorReports: boolean;
}): AdminAnalyticsGa4State {
  if (!input.propertyId) {
    return {
      status: "ga4_config_missing",
      truthState: "unavailable",
      sourceRole: "external_evidence_only",
      reason: "GA4 property configuration is missing; admin analytics must use first-party snapshots and mark GA4 unavailable.",
    };
  }

  if (!input.allowVendorReports) {
    return {
      status: "ga4_client_unused",
      truthState: "deferred",
      sourceRole: "external_evidence_only",
      reason: "GA4 evidence refresh is deferred on default admin analytics loads to avoid unnecessary vendor reads.",
    };
  }

  return {
    status: "ga4_evidence_only",
    truthState: "partial",
    sourceRole: "external_evidence_only",
    reason: "GA4 can be queried only as external evidence; first-party product truth remains authoritative.",
  };
}

export function buildSkippedVendorReport(label: string, issues: string[]): AnalyticsReportResponse & { sourceState: "deferred" } {
  issues.push(`Skipped ${label} GA report on default admin load; vendor evidence refresh requires explicit refresh.`);
  return {
    rows: [],
    fallbackUsed: true,
    sourceState: "deferred",
  } as AnalyticsReportResponse & { sourceState: "deferred" };
}

export function runVendorReportWhenAllowed(input: {
  allowVendorReports: boolean;
  analyticsClient: AdminAnalyticsDataClient;
  requestConfig: AdminAnalyticsReportRequestConfig;
  label: string;
  issues: string[];
}) {
  if (!input.allowVendorReports) {
    return Promise.resolve(buildSkippedVendorReport(input.label, input.issues));
  }

  return safeRunReport(input.analyticsClient, input.requestConfig);
}

export function getAdminAnalyticsPropertyId() {
  return process.env.GA_PROPERTY_ID || "";
}

export function createAdminAnalyticsDataClient() {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (clientEmail && privateKey) {
    return new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
        project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      },
    });
  }

  return new BetaAnalyticsDataClient();
}
