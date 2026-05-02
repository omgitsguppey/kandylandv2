import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const failures: string[] = [];

function read(relativePath: string) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }

  return fs.readFileSync(absolutePath, "utf8");
}

function walkFiles(root: string, extensions: string[]) {
  const absoluteRoot = path.join(repoRoot, root);
  if (!fs.existsSync(absoluteRoot)) {
    return [] as string[];
  }

  const found: string[] = [];
  const walk = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", ".next", "dist", "build"].includes(entry.name)) {
          continue;
        }
        walk(absolutePath);
        continue;
      }

      if (entry.isFile() && extensions.some((extension) => entry.name.endsWith(extension))) {
        found.push(path.relative(repoRoot, absolutePath).replaceAll("\\", "/"));
      }
    }
  };

  walk(absoluteRoot);
  return found;
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include ${needle}`);
  }
}

function requireIncludesInsensitive(source: string, needle: string, label: string) {
  if (!source.toLowerCase().includes(needle.toLowerCase())) {
    failures.push(`${label} must include ${needle}`);
  }
}

const resolverPath = "src/lib/creator-agreement-version.ts";
const resolver = read(resolverPath);
const contract = read("src/lib/creator-contract.ts");
const documents = read("src/lib/creator-agreement-documents.ts");
const signatureRoute = read("src/app/api/creator/onboarding/contract-signature/route.ts");
const dispatchServer = read("src/lib/server/creator-agreement-documents.ts");
const onboarding = read("src/lib/creator-onboarding.ts");
const packageJson = read("package.json");
const tests = read("tests/unit/creator-agreement-version.spec.ts");
const managerDocs = read("docs/agent-truth/creator-agreement-document-manager.md");
const signatureDocs = read("docs/agent-truth/creator-agreement-signature-ux.md");

[
  "getActiveCreatorAgreementVersion",
  "getActiveCreatorAgreementTemplate",
  "resolveCreatorAgreementForUser",
  "buildAgreementHash",
  "assertAgreementEvidenceComplete",
  "compareSignedAgreementToActive",
  "ACTIVE_CREATOR_AGREEMENT_EMBEDDED_FULL_TEXT_REFERENCE",
].forEach((needle) => requireIncludes(resolver, needle, "agreement version resolver"));

[
  "CREATOR_MASTER_SERVICE_AGREEMENT_VERSION",
  "mgsa_2026_v1",
].forEach((needle) => requireIncludes(contract, needle, "creator contract source"));

[
  "getDefaultActiveCreatorAgreementTemplate",
  "embeddedFullTextReference",
  "fullTextSnapshotPath",
  "effectiveAt",
  "compareSignedAgreementToActive",
].forEach((needle) => requireIncludes(documents, needle, "agreement document contract"));

[
  "assertAgreementEvidenceComplete",
  "requireSignatureEvidence: true",
  "requireSourceSnapshot: true",
  "embeddedFullTextReference",
].forEach((needle) => requireIncludes(signatureRoute, needle, "creator signature route"));

[
  "compareSignedAgreementToActive",
  "Creator and admin signatures must match the same agreement version and hash",
  "creatorSignatureAgreementVersion",
  "adminSignatureAgreementVersion",
  "legalStatus: \"legal_signed\"",
].forEach((needle) => requireIncludes(dispatchServer, needle, "admin countersign helper"));

requireIncludes(onboarding, "getActiveCreatorAgreementVersion", "creator onboarding projection");
requireIncludes(packageJson, "check:creator-agreement-version-truth", "package scripts");

[
  "active version resolves",
  "missing hash fails",
  "countersign mismatch",
  "signed old version remains valid",
].forEach((needle) => requireIncludes(tests, needle, "agreement version tests"));

[
  "single agreement version resolver",
  "active agreement template",
  "signed records cannot be mutated",
  "version/hash",
].forEach((needle) => requireIncludesInsensitive(`${managerDocs}\n${signatureDocs}`, needle, "agreement version docs"));

for (const filePath of walkFiles("src", [".ts", ".tsx"])) {
  if (filePath === "src/lib/creator-contract.ts" || filePath === resolverPath) {
    continue;
  }

  const contents = read(filePath);
  if (contents.includes("mgsa_2026_v1")) {
    failures.push(`Hardcoded mgsa_2026_v1 outside resolver/contract source: ${filePath}`);
  }
}

if (failures.length > 0) {
  console.error("Creator agreement version truth validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Creator agreement version truth validation passed.");
