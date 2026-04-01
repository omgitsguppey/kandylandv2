import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
const projectId = "kandydrops-rules-test";
const testCommand = `"${process.execPath}" "${vitestCli}" run --config vitest.rules.config.ts tests/firebase/storage.rules.spec.ts`;
const tempDir = mkdtempSync(join(tmpdir(), "kandydrops-storage-rules-"));
const firebaseConfigPath = join(tempDir, "firebase.storage.rules.json");
const firebaseConfig = {
    storage: {
        rules: join(process.cwd(), "storage.rules"),
    },
    emulators: {
        storage: {
            host: "127.0.0.1",
            port: 9299,
        },
    },
};

writeFileSync(firebaseConfigPath, `${JSON.stringify(firebaseConfig, null, 2)}\n`, "utf8");

const result = spawnSync(
    process.execPath,
    [
        firebaseCli,
        "emulators:exec",
        "--config",
        firebaseConfigPath,
        "--project",
        projectId,
        "--only",
        "storage",
        testCommand,
    ],
    {
        cwd: process.cwd(),
        env,
        stdio: "inherit",
    },
);

rmSync(tempDir, { recursive: true, force: true });

if (typeof result.status === "number") {
    process.exit(result.status);
}

process.exit(1);
