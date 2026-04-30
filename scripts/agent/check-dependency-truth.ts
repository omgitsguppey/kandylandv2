import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

type PackageJson = {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
};

type DependencyScope = {
    label: string;
    packageJsonPath: string;
    npmPrefix?: string;
    dependencies: string[];
};

async function readPackageJson(packageJsonPath: string): Promise<PackageJson> {
    const content = await fs.readFile(packageJsonPath, "utf-8");
    return JSON.parse(content) as PackageJson;
}

function runNpmLs(dep: string, npmPrefix?: string) {
    const prefix = npmPrefix ? `--prefix ${npmPrefix} ` : "";
    return execSync(`npm ${prefix}ls ${dep} --json --depth=0`, { encoding: "utf-8" });
}

function verifyDependency(input: {
    dep: string;
    deps: Record<string, string>;
    npmPrefix?: string;
    label: string;
}) {
    if (!input.deps[input.dep]) {
        console.warn(`WARNING: Critical dependency missing from ${input.label} package.json: ${input.dep}`);
        return 1;
    }

    try {
        const lsOutput = runNpmLs(input.dep, input.npmPrefix);
        const lsParsed = JSON.parse(lsOutput);
        const installedVersion = lsParsed.dependencies?.[input.dep]?.version;
        const expectedRange = input.deps[input.dep];

        if (!installedVersion) {
            console.warn(`WARNING: ${input.dep} is in ${input.label} package.json but not installed correctly.`);
            return 1;
        }

        console.log(`[PASS] ${input.label}:${input.dep} expected ${expectedRange}, installed ${installedVersion}`);
        return 0;
    } catch {
        console.warn(`WARNING: Error checking ${input.label}:${input.dep}. It might not be properly installed or has peer dependency issues.`);
        return 1;
    }
}

async function main() {
    const cwd = process.cwd();
    const scopes: DependencyScope[] = [
        {
            label: "root",
            packageJsonPath: path.join(cwd, "package.json"),
            dependencies: [
                "firebase",
                "firebase-admin",
                "@google-analytics/data",
                "google-auth-library",
                "@google-cloud/vertexai",
                "next",
                "react",
            ],
        },
        {
            label: "functions",
            packageJsonPath: path.join(cwd, "functions", "package.json"),
            npmPrefix: "functions",
            dependencies: [
                "firebase-admin",
                "firebase-functions",
                "@google-cloud/bigquery",
            ],
        },
    ];

    console.log("Dependency Truth Audit Start...");
    let warnings = 0;

    for (const scope of scopes) {
        try {
            const pkg = await readPackageJson(scope.packageJsonPath);
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            scope.dependencies.forEach((dep) => {
                warnings += verifyDependency({
                    dep,
                    deps,
                    npmPrefix: scope.npmPrefix,
                    label: scope.label,
                });
            });
        } catch {
            console.warn(`WARNING: Failed to read ${scope.label} package.json for dependency truth.`);
            warnings++;
        }
    }

    if (warnings > 0) {
        console.warn(`\nAudit finished with ${warnings} warnings. Check dependency truth!`);
    } else {
        console.log("\n[SUCCESS] Dependency truth verified. No critical mismatches.");
    }
}

main().catch((err) => {
    console.error("Fatal error during dependency truth check:", err);
    process.exit(1);
});
