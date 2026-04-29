import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const failures: string[] = [];

function walkFiles(directory: string, matcher: (filePath: string) => boolean): string[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(absolutePath, matcher));
    } else if (matcher(absolutePath)) {
      files.push(absolutePath);
    }
  }
  return files;
}

const requiredContains: Array<{ file: string; values: string[]; label: string }> = [
  {
    file: "src/app/not-found.tsx",
    label: "global 404 uses shared NotFoundSurface",
    values: ["NotFoundSurface", "return <NotFoundSurface />"],
  },
  {
    file: "src/app/creators/[username]/CreatorProfileClient.tsx",
    label: "creator missing state uses shared NotFoundSurface",
    values: ["NotFoundSurface", "Creator Unavailable"],
  },
  {
    file: "src/lib/server/not-found.ts",
    label: "API 404 helper returns canonical error shape",
    values: ["buildNotFoundResponse", "errorCode", "resource", "{ status: 404 }"],
  },
  {
    file: "src/lib/server/auth.ts",
    label: "AuthError 404s flow through canonical API 404 helper",
    values: ["buildNotFoundResponse", "error.status === 404", "resource?: ApiNotFoundResource"],
  },
  {
    file: "src/app/api/chat/threads/[threadId]/route.ts",
    label: "chat thread 404 preserves domain code through canonical helper",
    values: ["buildNotFoundResponse(\"thread\"", "\"thread_not_found\""],
  },
  {
    file: "src/app/api/notifications/route.ts",
    label: "notification 404 uses canonical helper",
    values: ["buildNotFoundResponse(\"notification\""],
  },
  {
    file: "src/app/api/creators/[username]/route.ts",
    label: "creator profile API 404 uses canonical helper",
    values: ["buildNotFoundResponse(\"creator\"", "Creator profile view count update failed"],
  },
];

for (const contract of requiredContains) {
  const source = readRepoFile(contract.file);
  for (const value of contract.values) {
    if (!source.includes(value)) {
      failures.push(`${contract.label}: missing ${value} in ${contract.file}`);
    }
  }
}

const bannedUiCopy = [
  { file: "src/app/not-found.tsx", pattern: /Looks like|Page Not Found|does not exist|Oops/i },
  { file: "src/app/error.tsx", pattern: /Something went wrong|Unknown Error|Oops/i },
  { file: "src/app/admin/error.tsx", pattern: /Something went wrong|Unknown Application Error|Oops/i },
  { file: "src/components/ErrorBoundary.tsx", pattern: /Something went wrong|Oops/i },
  { file: "src/components/Admin/CreateDropModal.tsx", pattern: /Drop not found!/ },
];

for (const check of bannedUiCopy) {
  const source = readRepoFile(check.file);
  if (check.pattern.test(source)) {
    failures.push(`banned 404/error copy remains in ${check.file}: ${check.pattern}`);
  }
}

const apiRouteFiles = walkFiles(path.join(root, "src", "app", "api"), (filePath) => filePath.endsWith(".ts"));
for (const apiRouteFile of apiRouteFiles) {
  const source = fs.readFileSync(apiRouteFile, "utf8");
  if (/status:\s*404/.test(source)) {
    failures.push(`direct API 404 response remains in ${path.relative(root, apiRouteFile)}`);
  }
}

if (failures.length > 0) {
  console.error("Not-found contract check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Not-found contract check passed (${requiredContains.length + bannedUiCopy.length + apiRouteFiles.length} checks).`);
