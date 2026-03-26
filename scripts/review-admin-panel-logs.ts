import { config as loadDotenv } from "dotenv";
import * as admin from "firebase-admin";

import { FIREBASE_DATABASE_URL, FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET } from "../src/lib/firebase-runtime";

loadDotenv({ path: ".env.local" });
loadDotenv();

function toNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toStringValue(value: unknown) {
    return typeof value === "string" ? value : "";
}

function formatRelative(timestamp: number) {
    if (!timestamp) {
        return "unknown";
    }

    const deltaMs = Math.max(0, Date.now() - timestamp);
    const minutes = Math.floor(deltaMs / 60_000);
    if (minutes < 1) {
        return "just now";
    }

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours}h ago`;
    }

    return `${Math.floor(hours / 24)}d ago`;
}

function getAdminDb() {
    if (!admin.apps.length) {
        const projectId = FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
        const storageBucket = FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET;
        const databaseURL = FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL;
        const baseConfig = {
            projectId,
            storageBucket,
            databaseURL,
        };

        if (projectId && clientEmail && privateKey) {
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

    return admin.firestore();
}

async function main() {
    const [{ ADMIN_PANEL_SYSTEM_LOG_COLLECTION }] = await Promise.all([
        import("../src/lib/admin-panel-system-logs"),
    ]);
    const adminDb = getAdminDb();

    const snapshot = await adminDb
        .collection(ADMIN_PANEL_SYSTEM_LOG_COLLECTION)
        .orderBy("updatedAtMs", "desc")
        .limit(40)
        .get();

    if (snapshot.empty) {
        console.log("No admin panel system logs found.");
        return;
    }

    const entries = snapshot.docs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return {
            id: doc.id,
            tab: toStringValue(data.tab) || "unknown",
            panelTitle: toStringValue(data.panelTitle) || doc.id,
            status: toStringValue(data.status) || "unknown",
            summary: toStringValue(data.summary) || "No summary recorded.",
            action: toStringValue(data.action) || "No action recorded.",
            signalCount: toNumber(data.signalCount),
            updatedAtMs: toNumber(data.updatedAtMs),
        };
    });

    const counts = entries.reduce((totals, entry) => {
        totals.total += 1;
        if (entry.status === "healthy") {
            totals.healthy += 1;
        } else if (entry.status === "warn") {
            totals.warn += 1;
        } else if (entry.status === "fail") {
            totals.fail += 1;
        }
        return totals;
    }, { total: 0, healthy: 0, warn: 0, fail: 0 });

    console.log("Admin panel system logs");
    console.log(`Total: ${counts.total} | Healthy: ${counts.healthy} | Warn: ${counts.warn} | Fail: ${counts.fail}`);
    console.log("");

    entries.forEach((entry) => {
        console.log(`[${entry.status.toUpperCase()}] ${entry.panelTitle} (${entry.tab})`);
        console.log(`  Signals: ${entry.signalCount} | Updated: ${formatRelative(entry.updatedAtMs)}`);
        console.log(`  Summary: ${entry.summary}`);
        console.log(`  Action: ${entry.action}`);
        console.log("");
    });
}

void main();
