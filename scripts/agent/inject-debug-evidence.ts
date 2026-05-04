import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  DEBUG_EVIDENCE_BUCKETS,
  redactDebugEvidenceForAudit,
  rankDebugEvidenceForAudit,
  type DebugEvidenceIndexArtifact,
  type DebugEvidenceRecord,
} from "../../src/lib/debug-evidence-contract";
import { DEBUG_EVIDENCE_INDEX_PATH } from "./load-debug-evidence-for-audit";

async function loadRecentDebugEvidenceFromFirestore() {
  try {
    const admin = await import("firebase-admin");
    if (!admin.apps.length) {
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
      if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        });
      } else {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId,
        });
      }
    }

    const sinceMs = Date.now() - (7 * 24 * 60 * 60 * 1_000);
    const snapshot = await admin.firestore()
      .collection(DEBUG_EVIDENCE_BUCKETS.rollups)
      .orderBy("lastSeenAt", "desc")
      .limit(100)
      .get();

    return snapshot.docs
      .map((doc) => {
        const data = doc.data() as DebugEvidenceRecord;
        return redactDebugEvidenceForAudit({
          ...data,
          id: typeof data.id === "string" ? data.id : doc.id,
        });
      })
      .filter((record) => record.lastSeenAt >= sinceMs);
  } catch {
    return [];
  }
}

export async function buildDebugEvidenceIndex(root = process.cwd()): Promise<DebugEvidenceIndexArtifact> {
  const records = await loadRecentDebugEvidenceFromFirestore();
  const sorted = records.sort(rankDebugEvidenceForAudit).slice(0, 100);

  return {
    generatedAt: new Date().toISOString(),
    source: sorted.length > 0 ? "firestore" : "unavailable",
    buckets: DEBUG_EVIDENCE_BUCKETS,
    records: sorted,
    redacted: true,
    notes: sorted.length > 0
      ? ["Loaded recent redacted debug evidence rollups for deterministic audit injection."]
      : ["No live debug evidence was available in this local run. The artifact remains valid and redacted."],
  };
}

export async function writeDebugEvidenceIndex(root = process.cwd()) {
  const artifact = await buildDebugEvidenceIndex(root);
  const fullPath = join(root, DEBUG_EVIDENCE_INDEX_PATH);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(artifact, null, 2)}\n`);
  return artifact;
}

writeDebugEvidenceIndex()
  .then((artifact) => {
    console.log(`Debug evidence index: ${artifact.records.length} redacted record(s), source=${artifact.source}`);
  })
  .catch((error) => {
    console.error("Debug evidence index generation failed:", error);
    process.exit(1);
  });
