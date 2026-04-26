import fs from "fs";
import path from "path";

async function runCheck() {
    console.log("Running Infrastructure Truth Check...");

    const rootPkgPath = path.join(process.cwd(), "package.json");
    const funcPkgPath = path.join(process.cwd(), "functions", "package.json");

    if (!fs.existsSync(rootPkgPath)) {
        console.error("❌ Root package.json not found!");
        process.exit(1);
    }

    const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf-8"));
    const funcPkg = fs.existsSync(funcPkgPath) ? JSON.parse(fs.readFileSync(funcPkgPath, "utf-8")) : {};

    const errors: string[] = [];
    const warnings: string[] = [];

    const verifyDep = (name: string, expectedVersionPrefix?: string) => {
        let version = rootPkg.dependencies?.[name] || rootPkg.devDependencies?.[name];
        let foundIn = "root";

        if (!version) {
            version = funcPkg.dependencies?.[name] || funcPkg.devDependencies?.[name];
            foundIn = "functions";
        }

        if (!version) {
            // Optional GCP dependencies might not be explicitly installed if relying on transient ones
            if (name.startsWith("@google-cloud/")) {
                warnings.push(`Optional GCP dependency missing explicitly: ${name}`);
                return;
            }
            errors.push(`Missing dependency: ${name}`);
            return;
        }

        if (expectedVersionPrefix && !version.startsWith(expectedVersionPrefix) && !version.includes(expectedVersionPrefix)) {
             warnings.push(`Dependency ${name} (in ${foundIn}) is on version ${version}, but expected around ${expectedVersionPrefix}`);
        }
        console.log(`✅ Verified ${name} (in ${foundIn}): ${version}`);
    };

    // Firebase
    verifyDep("firebase");
    verifyDep("firebase-admin");
    verifyDep("firebase-functions");

    // Next/React
    verifyDep("next");
    verifyDep("react");

    // GCP
    verifyDep("@google-cloud/pubsub");
    verifyDep("@google-cloud/storage");

    if (errors.length > 0) {
        console.error("\n❌ Infrastructure Truth Check Failed:");
        errors.forEach(e => console.error(`  - ${e}`));
        process.exit(1);
    }

    if (warnings.length > 0) {
        console.warn("\n⚠️ Infrastructure Truth Check Warnings:");
        warnings.forEach(w => console.warn(`  - ${w}`));
    }

    console.log("\n✅ Infrastructure Truth Check Passed!");
}

runCheck().catch(e => {
    console.error("Unhandled error in check-infrastructure-truth", e);
    process.exit(1);
});
