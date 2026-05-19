import "server-only";

import { BetaAnalyticsDataClient } from "@google-analytics/data";

import {
  buildGa4EvidenceState,
  shouldRunGa4AdminRefresh,
} from "@/lib/analytics/ga4-truth";
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
  const evidenceState = buildGa4EvidenceState({
    propertyId: input.propertyId,
    measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.GA_MEASUREMENT_ID,
    apiSecretPresent: Boolean(process.env.GA_API_SECRET),
    clientCodePresent: true,
    serverDataApiDependencyPresent: true,
  });

  if (evidenceState.status === "config_missing") {
    return {
      status: "ga4_config_missing",
      truthState: "unavailable",
      sourceRole: "external_evidence_only",
      reason: evidenceState.reason,
    };
  }

  if (!shouldRunGa4AdminRefresh({
    explicitRefresh: input.allowVendorReports,
    propertyId: input.propertyId,
  })) {
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
  const propertyId = typeof input.requestConfig?.property === "string"
    ? input.requestConfig.property.replace(/^properties\//u, "")
    : "";

  if (!shouldRunGa4AdminRefresh({
    explicitRefresh: input.allowVendorReports,
    propertyId,
  })) {
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
