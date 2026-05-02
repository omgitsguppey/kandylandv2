import fs from "node:fs";
import path from "node:path";
import * as admin from "firebase-admin";

import {
  explainLegacyMapping,
  readLegacyCreatorApplicationFromUser,
} from "@/lib/server/creator-onboarding-legacy-adapter";

const repoRoot = process.cwd();
const reportPath = path.join(repoRoot, "agent/state/legacy-creator-application-inventory.generated.json");
const args = new Set(process.argv.slice(2));
const writeRequested = args.has("--write");
const generatedAt = new Date().toISOString();

const requiredEntryFields = [
  "userId",
  "hasLegacyCreatorApplication",
  "hasCanonicalCreatorOnboarding",
  "hasReviewQueueEntry",
  "migrationNeeded",
  "mappingConfidence",
  "missingFields",
  "blockingRisks",
  "recommendedAction",
] as const;

type InventoryEntry = Record<(typeof requiredEntryFields)[number], unknown> & {
  legacyCreatorApplicationDetected: boolean;
  legacyCreatorApplicationMapped: boolean;
  legacyCreatorApplicationSkipped: boolean;
  mappingWarnings: string[];
};

function writeReport(report: Record<string, unknown>) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

async function loadAdminDb() {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const databaseURL = process.env.FIREBASE_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

    if (!admin.apps.length) {
      const baseConfig = {
        projectId,
        storageBucket,
        databaseURL,
      };

      if (clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          ...baseConfig,
        });
      } else {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          ...baseConfig,
        });
      }
    }

    return {
      adminDb: admin.firestore(),
      runtimeAvailable: true,
      runtimeError: null,
    };
  } catch (error) {
    return {
      adminDb: null,
      runtimeAvailable: false,
      runtimeError: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildUnavailableReport(runtimeError: string | null) {
  return {
    generatedAt,
    mode: "dry-run",
    writeRequested,
    writeModeImplemented: false,
    runtimeAvailable: false,
    runtimeError,
    requiredEntryFields,
    totals: {
      scannedUsers: 0,
      legacyCreatorApplications: 0,
      canonicalCreatorOnboarding: 0,
      reviewQueueEntries: 0,
      migrationNeeded: 0,
    },
    entries: [] as InventoryEntry[],
  };
}

async function main() {
  if (writeRequested) {
    throw new Error(
      "Write mode is intentionally not implemented in this launch adapter pass. Re-run without --write for the dry-run inventory.",
    );
  }

  const { adminDb, runtimeAvailable, runtimeError } = await loadAdminDb();
  if (!runtimeAvailable || !adminDb) {
    writeReport(buildUnavailableReport(runtimeError));
    console.log(`Legacy creatorApplication inventory wrote dry-run report without Firebase runtime: ${reportPath}`);
    return;
  }

  const usersSnapshot = await adminDb.collection("users").get();
  const entries: InventoryEntry[] = await Promise.all(usersSnapshot.docs.map(async (userDoc: {
    id: string;
    data: () => Record<string, unknown>;
  }) => {
    const userData = userDoc.data();
    const legacy = readLegacyCreatorApplicationFromUser({ id: userDoc.id, data: () => userData });
    const [onboardingSnap, queueSnap] = await Promise.all([
      adminDb.collection("creator_onboarding").doc(userDoc.id).get(),
      adminDb.collection("creator_review_queue").doc(userDoc.id).get(),
    ]);
    const hasCanonicalCreatorOnboarding = Boolean(onboardingSnap.exists);
    const hasReviewQueueEntry = Boolean(queueSnap.exists);
    const explanation = explainLegacyMapping({
      userId: userDoc.id,
      userDoc: { ...userData, uid: userDoc.id },
      existingCanonical: onboardingSnap.data(),
    });
    const hasLegacyCreatorApplication = Boolean(legacy);
    const migrationNeeded = hasLegacyCreatorApplication && !hasCanonicalCreatorOnboarding;

    return {
      userId: userDoc.id,
      hasLegacyCreatorApplication,
      hasCanonicalCreatorOnboarding,
      hasReviewQueueEntry,
      migrationNeeded,
      mappingConfidence: explanation.mappingConfidence,
      missingFields: explanation.missingFields,
      blockingRisks: explanation.blockingRisks,
      recommendedAction: migrationNeeded
        ? explanation.recommendedAction
        : hasLegacyCreatorApplication
          ? "No backfill write needed because canonical onboarding already exists."
          : "No legacy creatorApplication found.",
      legacyCreatorApplicationDetected: explanation.legacyCreatorApplicationDetected,
      legacyCreatorApplicationMapped: explanation.legacyCreatorApplicationMapped,
      legacyCreatorApplicationSkipped: explanation.legacyCreatorApplicationSkipped,
      mappingWarnings: explanation.mappingWarnings,
    };
  }));

  const report = {
    generatedAt,
    mode: "dry-run",
    writeRequested,
    writeModeImplemented: false,
    runtimeAvailable: true,
    requiredEntryFields,
    rules: {
      dryRunDefault: true,
      canonicalFirst: "Backfill creates creator_onboarding before rebuilding creator_review_queue and users.creatorApplication projection.",
      projectionOnly: "users/{uid}.creatorApplication remains a projection and legacy-compatible read path.",
      noSignatureInference: "Legacy legal/signature completion is not inferred without timestamp, signer, and agreement identity evidence.",
    },
    totals: {
      scannedUsers: entries.length,
      legacyCreatorApplications: entries.filter((entry) => entry.hasLegacyCreatorApplication).length,
      canonicalCreatorOnboarding: entries.filter((entry) => entry.hasCanonicalCreatorOnboarding).length,
      reviewQueueEntries: entries.filter((entry) => entry.hasReviewQueueEntry).length,
      migrationNeeded: entries.filter((entry) => entry.migrationNeeded).length,
      backfillCandidates: entries.filter((entry) => entry.migrationNeeded).length,
    },
    entries,
  };

  writeReport(report);
  console.log(`Legacy creatorApplication inventory wrote dry-run report: ${reportPath}`);
}

main().catch((error) => {
  console.error("Legacy creatorApplication inventory failed:", error);
  process.exit(1);
});
