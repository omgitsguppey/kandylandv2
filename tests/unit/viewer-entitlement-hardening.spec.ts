import { spawnSync } from "node:child_process";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { describe, expect, it } from "vitest";

import {
  VIEWER_DROP_ENTITLEMENT_EVIDENCE,
  buildViewerDropEntitlementPayload,
} from "@/lib/server/viewer-drop-entitlement";
import type { Drop } from "@/types/db";

describe("viewer drop entitlement hardening", () => {
  it("keeps raw drop reads server-side and only returns sanitized viewer payloads", () => {
    const rawDrop = {
      id: "drop_secure",
      creatorId: "creator_1",
      contentUrl: "https://storage.googleapis.com/private/drop.mp4",
      contentUrls: [
        "https://storage.googleapis.com/private/drop-1.mp4",
        "https://storage.googleapis.com/private/drop-2.mp4",
      ],
    } as Drop;

    const result = buildViewerDropEntitlementPayload(rawDrop);

    expect(result.drop?.contentUrl).toBe("");
    expect(result.drop?.contentUrls).toEqual(["", ""]);
    expect(result.evidence).toMatchObject({
      viewerRouteEntitlementGuarded: true,
      rawDropSanitized: true,
      privateMediaHiddenUntilEntitled: true,
      contentFetchRoute: "/api/drops/content",
    });
    expect(VIEWER_DROP_ENTITLEMENT_EVIDENCE.privateMediaHiddenUntilEntitled).toBe(true);
    expect(JSON.stringify(result)).not.toContain("storage.googleapis.com/private");
  });
});

const viewerPagePath = "src/app/dashboard/viewer/page.tsx";
const currentViewerPage = readFileSync(join(process.cwd(), viewerPagePath), "utf8");

function runViewerSourceCli(source: string, cli: string) {
  const workspace = process.cwd();
  const temporary = resolve(mkdtempSync(join(tmpdir(), "viewer-entitlement-cli-")));
  const temporaryParent = resolve(tmpdir());
  if (dirname(temporary) !== temporaryParent || !basename(temporary).startsWith("viewer-entitlement-cli-")) throw new Error("Invalid owned fixture root");
  try {
    const preload = join(temporary, "source-overlay.cjs");
    const hook = [
      "const fs = require('node:fs'), path = require('node:path');",
      `const workspace = ${JSON.stringify(workspace)}, temporary = ${JSON.stringify(temporary)};`,
      `const overlays = new Map([[${JSON.stringify(resolve(workspace, viewerPagePath))}, ${JSON.stringify(source)}]]);`,
      "const read = fs.readFileSync, write = fs.writeFileSync, mkdir = fs.mkdirSync;",
      "function output(file) { const absolute = path.resolve(String(file)); for (const owner of [path.join(workspace, 'agent', 'state'), path.join(workspace, 'docs', 'agent-truth')]) { if (absolute === owner || absolute.startsWith(owner + path.sep)) return path.join(temporary, path.relative(workspace, absolute)); } if (absolute.startsWith(workspace + path.sep)) throw new Error('Unexpected fixture repository write: ' + absolute); return absolute; }",
      "fs.readFileSync = function(file, options) { const source = overlays.get(path.resolve(String(file))); return source === undefined ? read.apply(this, arguments) : typeof options === 'string' || options?.encoding ? source : Buffer.from(source); };",
      "fs.mkdirSync = function(file, options) { return mkdir.call(this, output(file), options); };",
      "fs.writeFileSync = function(file, data, options) { const target = output(file); mkdir(path.dirname(target), { recursive: true }); return write.call(this, target, data, options); };",
      "require('node:module').syncBuiltinESMExports();",
    ].join("\n");
    writeFileSync(preload, hook, { flag: "wx" });
    const child = spawnSync(process.execPath, ["--require", preload, "--import", "tsx", resolve(workspace, cli)], {
      cwd: workspace,
      encoding: "utf8",
      timeout: 20_000,
      windowsHide: true,
    });
    return { status: child.status, error: child.error, log: `${child.stdout ?? ""}${child.stderr ?? ""}` };
  } finally {
    if (dirname(temporary) !== temporaryParent || !basename(temporary).startsWith("viewer-entitlement-cli-")) throw new Error("Invalid fixture cleanup target");
    rmSync(temporary, { recursive: true, force: true });
  }
}

function aliasedViewerPage(source: string) {
  const aliases: Record<string, string> = {
    resolveDropViewAccess: "accessFor",
    verifyNavigationSessionCookieValue: "verifySession",
    getDropRaw: "loadDrop",
    sanitizeDropForClient: "clientPayload",
    ViewerClient: "ProtectedViewer",
    adminDb: "profileStore",
    adminAuth: "identityAdmin",
    redirect: "goPreview",
    navigationSession: "session",
    viewerAccess: "decision",
    rawDrop: "fetchedDrop",
  };
  let aliased = source.replace(/\b(?:resolveDropViewAccess|verifyNavigationSessionCookieValue|getDropRaw|sanitizeDropForClient|ViewerClient|adminDb|adminAuth|redirect|navigationSession|viewerAccess|rawDrop)\b/g, word => aliases[word]);
  aliased = aliased
    .replace('import { accessFor } from "@/lib/drop-view-access";', 'import { resolveDropViewAccess as accessFor } from "@/lib/drop-view-access";')
    .replace('import { NAV_SESSION_COOKIE, verifySession } from "@/lib/navigation-session";', 'import { NAV_SESSION_COOKIE, verifyNavigationSessionCookieValue as verifySession } from "@/lib/navigation-session";')
    .replace('import { loadDrop, clientPayload } from "@/lib/server/drops";', 'import { getDropRaw as loadDrop, sanitizeDropForClient as clientPayload } from "@/lib/server/drops";')
    .replace('import { ProtectedViewer } from "./ProtectedViewer";', 'import { ViewerClient as ProtectedViewer } from "./ViewerClient";')
    .replace('import { identityAdmin, profileStore } from "@/lib/server/firebase-admin";', 'import { adminAuth as identityAdmin, adminDb as profileStore } from "@/lib/server/firebase-admin";')
    .replace('import { notFound, goPreview } from "next/navigation";', 'import { notFound, redirect as goPreview } from "next/navigation";')
    .replace("if (!decision.allowed)", "if (decision.allowed === false)");
  return aliased;
}

const sourceCliOwners = [
  "scripts/agent/validate-viewer-entitlement-hardening.ts",
  "scripts/agent/validate-content-media-pipeline.ts",
] as const;

describe("viewer entitlement source admission", () => {
  it.each([
    ["current direct server route", currentViewerPage],
    ["named-import and local aliases with equivalent denial predicate", aliasedViewerPage(currentViewerPage)],
  ])("accepts the %s through both existing CLI owners", (_name, source) => {
    for (const cli of sourceCliOwners) {
      const result = runViewerSourceCli(source, cli);
      expect(result.error, result.log).toBeUndefined();
      expect(result.status, result.log).toBe(0);
    }
  }, 60_000);

  it.each([
    ["wrong actor plus obsolete comment/helper markers", currentViewerPage.replace("userId: navigationSession.uid", 'userId: "wrong_user"') + "\n// userId: navigationSession.uid; buildViewerDropEntitlementPayload\n"],
    ["profile actor differs from verified actor", currentViewerPage.replace("uid: navigationSession.uid", 'uid: "wrong_profile"')],
    ["disabled denial with the old predicate in a comment", currentViewerPage.replace("if (!viewerAccess.allowed)", "if (false)") + "\n// if (!viewerAccess.allowed)\n"],
    ["raw alias returned despite an unused sanitizer", currentViewerPage.replace("const drop = sanitizeDropForClient(rawDrop);", "const unusedSafeDrop = sanitizeDropForClient(rawDrop);\n    const drop = rawDrop;")],
    ["raw payload passed directly", currentViewerPage.replace("<ViewerClient drop={drop}", "<ViewerClient drop={rawDrop}")],
    ["different fetched Drop reaches the client", currentViewerPage.replace("const drop = sanitizeDropForClient(rawDrop);", 'const otherDrop = await getDropRaw("other_drop");\n    const drop = sanitizeDropForClient(otherDrop);')],
    ["same resolver spelling from a different module", currentViewerPage.replace('from "@/lib/drop-view-access"', 'from "@/lib/wrong-access-owner"')],
  ])("rejects %s through both existing CLI owners", (_name, source) => {
    for (const cli of sourceCliOwners) {
      const result = runViewerSourceCli(source, cli);
      expect(result.error, result.log).toBeUndefined();
      expect(result.status, result.log).toBe(1);
      expect(result.log).toMatch(/viewer page lacks|raw drop is not sanitized|raw drop fields may reach/i);
    }
  }, 60_000);
});
