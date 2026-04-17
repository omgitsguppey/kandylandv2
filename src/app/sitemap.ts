import type { MetadataRoute } from "next";

import { PRIVACY_POLICY_VERSION, TERMS_LAST_UPDATED } from "@/lib/platform-config";
import { SITE_ORIGIN } from "@/lib/site-origin";
import { adminDb } from "@/lib/server/firebase-admin";

const FALLBACK_PUBLIC_LAST_MODIFIED = new Date("2026-02-12T00:00:00.000Z");

async function getLatestPublicDropTimestamp() {
  if (!adminDb) {
    return FALLBACK_PUBLIC_LAST_MODIFIED;
  }

  try {
    const snapshot = await adminDb
      .collection("drops")
      .where("validFrom", "<=", Date.now())
      .orderBy("validFrom", "desc")
      .limit(1)
      .get();

    const latestValidFrom = snapshot.docs[0]?.data()?.validFrom;
    if (typeof latestValidFrom === "number" && Number.isFinite(latestValidFrom)) {
      return new Date(Math.min(latestValidFrom, Date.now()));
    }
  } catch (error) {
    console.error("Failed to resolve sitemap public timestamp:", error);
  }

  return FALLBACK_PUBLIC_LAST_MODIFIED;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const latestPublicDropAt = await getLatestPublicDropTimestamp();

  return [
    {
      url: SITE_ORIGIN,
      lastModified: latestPublicDropAt,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_ORIGIN}/drops`,
      lastModified: latestPublicDropAt,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_ORIGIN}/experiences`,
      lastModified: latestPublicDropAt,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_ORIGIN}/faq`,
      lastModified: latestPublicDropAt,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${SITE_ORIGIN}/terms`,
      lastModified: new Date(`${TERMS_LAST_UPDATED}T00:00:00.000Z`),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_ORIGIN}/privacy`,
      lastModified: new Date(`${PRIVACY_POLICY_VERSION}T00:00:00.000Z`),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
