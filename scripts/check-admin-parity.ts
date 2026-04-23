import { readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();

const routeExpectations = [
  "src/app/api/admin/overview/route.ts",
  "src/app/api/admin/users/route.ts",
  "src/app/api/admin/user/[userId]/route.ts",
  "src/app/api/admin/support/threads/route.ts",
  "src/app/api/admin/moderation/security-alerts/route.ts",
  "src/app/api/admin/content/route.ts",
  "src/app/api/admin/ai/drop-covers/route.ts",
  "src/app/api/admin/debug/route.ts",
] as const;

const clientParityExpectations = [
  {
    file: "src/app/admin/AdminPrivacyPreflight.tsx",
    pattern: "AdminStatusBadge",
    message: "Privacy preflight must use the shared admin status badge.",
  },

  {
    file: "src/app/admin/users/page.tsx",
    pattern: "AdminSurfaceState",
    message: "Admin users page must use the shared admin surface-state contract.",
  },
];

async function ensurePattern(file: string, pattern: string, message: string) {
  const content = await readFile(path.join(repoRoot, file), "utf8");
  if (!content.includes(pattern)) {
    throw new Error(`${message} Missing pattern "${pattern}" in ${file}.`);
  }
}

async function main() {
  for (const file of routeExpectations) {
    await ensurePattern(file, "verification:", "Admin route must expose canonical verification metadata.");
  }

  for (const expectation of clientParityExpectations) {
    await ensurePattern(expectation.file, expectation.pattern, expectation.message);
  }

  console.log("Admin parity verification passed for canonical route and client status contracts.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
