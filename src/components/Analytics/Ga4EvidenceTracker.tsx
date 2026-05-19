"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useEffect, useState } from "react";

import { isGa4ClientEnabled } from "@/lib/analytics/ga4-truth";
import {
  applyAnalyticsConsentToGtag,
  canUseAnonymousAnalytics,
  readPrivacySettingsSnapshot,
  subscribeToPrivacySettings,
} from "@/lib/privacy-consent";

export function Ga4EvidenceTracker() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";
  const [analyticsAllowed, setAnalyticsAllowed] = useState(() =>
    canUseAnonymousAnalytics(readPrivacySettingsSnapshot()));
  const enabled = isGa4ClientEnabled({
    measurementId,
    consentGranted: analyticsAllowed,
  });

  useEffect(() => {
    return subscribeToPrivacySettings(() => {
      const nextSettings = readPrivacySettingsSnapshot();
      applyAnalyticsConsentToGtag(nextSettings);
      setAnalyticsAllowed(canUseAnonymousAnalytics(nextSettings));
    });
  }, []);

  useEffect(() => {
    if (enabled) {
      applyAnalyticsConsentToGtag();
    }
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return <GoogleAnalytics gaId={measurementId} />;
}
