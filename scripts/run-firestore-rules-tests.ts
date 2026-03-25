import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function findJavaHome() {
    if (process.env.JAVA_HOME && existsSync(join(process.env.JAVA_HOME, "bin", process.platform === "win32" ? "java.exe" : "java"))) {
        return process.env.JAVA_HOME;
    }

    if (process.platform === "win32") {
        const localPrograms = join(process.env.LOCALAPPDATA || "", "Programs", "Temurin");
        if (existsSync(localPrograms)) {
            const candidates = readdirSync(localPrograms)
                .map((entry) => join(localPrograms, entry))
                .filter((entry) => existsSync(join(entry, "bin", "java.exe")))
                .sort()
                .reverse();
            if (candidates.length > 0) {
                return candidates[0];
            }
        }
    }

    return "";
}

const javaHome = findJavaHome();
const env = { ...process.env };
if (javaHome) {
    env.JAVA_HOME = javaHome;
    env.PATH = `${join(javaHome, "bin")}${process.platform === "win32" ? ";" : ":"}${env.PATH || ""}`;
}

const firebaseCli = join(
    process.cwd(),
    "node_modules",
    "firebase-tools",
    "lib",
    "bin",
    "firebase.js",
);
const vitestCli = join(process.cwd(), "node_modules", "vitest", "vitest.mjs");
const testCommand = `"${process.execPath}" "${vitestCli}" run --config vitest.rules.config.ts tests/firebase/firestore.rules.spec.ts`;

const result = spawnSync(
    process.execPath,
    [
        firebaseCli,
        "emulators:exec",
        "--only",
        "firestore",
        testCommand,
    ],
    {
        cwd: process.cwd(),
        env,
        stdio: "inherit",
    },
);

if (typeof result.status === "number") {
    process.exit(result.status);
}

process.exit(1);
