import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

async function main() {
    const cwd = process.cwd();
    const packageJsonPath = path.join(cwd, "package.json");
    
    let pkg: any;
    try {
        const content = await fs.readFile(packageJsonPath, "utf-8");
        pkg = JSON.parse(content);
    } catch (e) {
        console.error("Failed to read package.json");
        process.exit(1);
    }

    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const criticalDeps = [
        "firebase",
        "firebase-admin",
        "@google-cloud/vertexai",
        "next",
        "react"
    ];

    console.log("Dependency Truth Audit Start...");
    let warnings = 0;

    for (const dep of criticalDeps) {
        if (!deps[dep]) {
            console.warn(`WARNING: Critical dependency missing from package.json: ${dep}`);
            warnings++;
            continue;
        }

        try {
            // Using npm ls to verify installed version matches package.json
            const lsOutput = execSync(`npm ls ${dep} --json --depth=0`, { encoding: "utf-8" });
            const lsParsed = JSON.parse(lsOutput);
            
            const installedVersion = lsParsed.dependencies?.[dep]?.version;
            const expectedRange = deps[dep];

            if (!installedVersion) {
                console.warn(`WARNING: ${dep} is in package.json but not installed correctly.`);
                warnings++;
            } else {
                console.log(`[PASS] ${dep} expected ${expectedRange}, installed ${installedVersion}`);
            }
        } catch (e) {
            console.warn(`WARNING: Error checking ${dep}. It might not be properly installed or has peer dependency issues.`);
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
