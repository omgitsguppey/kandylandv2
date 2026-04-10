import { existsSync } from "node:fs";
import { resolve } from "node:path";

const GENERATED_ARTIFACTS = [
    ".next",
    "coverage",
    "playwright-report",
    "test-results",
    "lighthouse-results",
    "firebase-export",
    "build.log",
    "database-debug.log",
    "firestore-debug.log",
    "storage-debug.log",
    "firebase-debug.log",
];

const found = GENERATED_ARTIFACTS
    .map((relativePath) => ({
        relativePath,
        absolutePath: resolve(process.cwd(), relativePath),
    }))
    .filter((entry) => existsSync(entry.absolutePath));

if (found.length > 0) {
    console.error("Generated artifacts must be cleaned before sign-off:");
    found.forEach((entry) => {
        console.error(`- ${entry.relativePath}`);
    });
    process.exit(1);
}

console.log("No generated UI or build artifacts detected.");
