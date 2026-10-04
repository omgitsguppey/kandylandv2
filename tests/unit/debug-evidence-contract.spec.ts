import { describe, expect, it } from "vitest";
import { dirname, join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import {
  buildDebugEvidenceFingerprint,
  buildDebugEvidenceRecord,
  mapDebugCategoryToAuditDomains,
  redactDebugEvidenceForAudit,
  sanitizeDebugTechnicalDetail,
} from "@/lib/debug-evidence-contract";

describe("debug evidence contract", () => {
  it("deduplicates stable fingerprints from normalized evidence inputs", () => {
    const first = buildDebugEvidenceFingerprint({
      source: "route",
      category: "support",
      route: "admin/support/threads",
      component: "AdminSupportQueue",
      entityType: "support_thread",
      entityId: "thread_1",
      message: "Support thread list failed for admin route.",
    });
    const second = buildDebugEvidenceFingerprint({
      source: "route",
      category: "support",
      route: "admin/support/threads",
      component: "AdminSupportQueue",
      entityType: "support_thread",
      entityId: "thread_1",
      message: "Support thread list failed for admin route.",
    });

    expect(first).toBe(second);
  });

  it("redacts sensitive technical detail from public audit evidence", () => {
    const detail = sanitizeDebugTechnicalDetail({
      body: "private support body",
      Authorization: "Bearer secret",
      status: 403,
      route: "/api/admin/support/threads/thread_1",
    });

    expect(detail.body).toBe("[redacted]");
    expect(detail.Authorization).toBe("[redacted]");
    expect(detail.status).toBe(403);
    expect(detail.route).toBe("/api/admin/support/threads/thread_1");
  });

  it("builds redacted audit summaries and maps support evidence into audit domains", () => {
    const record = buildDebugEvidenceRecord({
      source: "admin",
      severity: "warn",
      category: "support",
      route: "/api/admin/support/threads/thread_1",
      component: "AdminSupportQueue",
      userId: "user_1",
      message: "Support message detail route returned forbidden.",
      humanMessage: "Support message detail route returned forbidden.",
      technicalDetail: { userEmail: "user@example.com" },
    });
    const summary = redactDebugEvidenceForAudit(record);

    expect(summary.fingerprint).toBe(record.fingerprint);
    expect(JSON.stringify(summary)).not.toContain("user_1");
    expect(JSON.stringify(summary)).not.toContain("user@example.com");
    expect(mapDebugCategoryToAuditDomains("support")).toContain("support");
  });
});

describe("Debug evidence active Support source guard", () => {
  const repositoryRoot = process.cwd();
  const legacyCopyDecoy = "\n// Historical text only: Admin support thread read was blocked. Check admin role, support_threads rules, and admin support API route.\n// Historical text only: Support message detail route returned forbidden.\n";
  function changeOnce(source: string, oldText: string, newText: string) {
    expect(source.split(oldText)).toHaveLength(2);
    return source.replace(oldText, newText);
  }
  function runReader(change?: (input: { hook: string; queue: string }) => { hook: string; queue: string }) {
    const base = resolve(process.env.KANDY_DEBUG_READER_PROOF_DIR ?? tmpdir());
    mkdirSync(base, { recursive: true });
    const directory = mkdtempSync(join(base, "kandy-debug-source-"));
    if (dirname(directory) !== base || !directory.startsWith(base + sep)) throw new Error("Reader fixture directory escaped its explicit temporary base.");
    try {
      const hookPath = join(repositoryRoot, "src/hooks/useAdminSupportRealtime.ts");
      const queuePath = join(repositoryRoot, "src/components/Admin/AdminSupportQueue.tsx");
      const original = { hook: readFileSync(hookPath, "utf8").replace(/\r\n/g, "\n"), queue: readFileSync(queuePath, "utf8").replace(/\r\n/g, "\n") };
      const inputs = change ? change(original) : original;
      const hookFile = join(directory, "hook.source"), queueFile = join(directory, "queue.source");
      writeFileSync(hookFile, inputs.hook);
      writeFileSync(queueFile, inputs.queue);
      const sourceFile = process.env.KANDY_DEBUG_EVIDENCE_READER_SOURCE ?? join(repositoryRoot, "scripts/agent/validate-debug-evidence-pipeline.ts");
      const requestFile = join(directory, "inputs.json");
      writeFileSync(requestFile, JSON.stringify({ root: repositoryRoot, sourceFile, overrides: { [hookPath]: hookFile, [queuePath]: queueFile } }));
      const entryFile = join(directory, "reader.cjs");
      writeFileSync(entryFile, `const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');const request=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const ts=require(path.join(request.root,'node_modules/typescript'));const source=fs.readFileSync(request.sourceFile,'utf8');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const child=new Module(__filename,module);child.filename=__filename;child.paths=Module._nodeModulePaths(request.root);child.require=function(name){if(name==='node:fs')return{...fs,readFileSync(file,...args){const absolute=path.resolve(String(file));return fs.readFileSync(request.overrides[absolute]||file,...args);}};return Module.prototype.require.call(this,name)};child._compile(code,__filename);`);
      const result = spawnSync(process.execPath, [entryFile, requestFile], { cwd: repositoryRoot, encoding: "utf8", windowsHide: true, timeout: 15000 });
      expect(result.error).toBeUndefined();
      return { status: result.status, stdout: result.stdout, stderr: result.stderr };
    } finally {
      if (dirname(directory) !== base || !directory.startsWith(base + sep)) throw new Error("Refuse fixture cleanup outside the exact temporary base.");
      rmSync(directory, { recursive: true, force: true });
    }
  }
  it("accepts the actual typed Support hook, operator display, and guarded Debug detail binding", () => {
    const result = runReader();
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Debug evidence pipeline validation passed.");
  });
  it("rejects a comment-only canonical decoder when active reads bypass typed acknowledgement", () => {
    const result = runReader(({ hook, queue }) => ({ hook: changeOnce(hook, 'return readUiJson<T>(response, { moduleLabel: "Admin support", url, requireSuccess: true });', 'return response.json() as Promise<T>; // readUiJson remains imported but disconnected') + legacyCopyDecoy, queue }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("refreshThreads must consume the returned canonical typed readUiJson acknowledgement");
    expect(result.stderr).toContain("refreshMessages must consume the returned canonical typed readUiJson acknowledgement");
  });
  it("rejects rewrapping the typed read error into a message-only Error", () => {
    const result = runReader(({ hook, queue }) => ({ hook: hook.replaceAll("error instanceof Error ? error : new Error", "error instanceof Error ? new Error(error.message) : new Error") + legacyCopyDecoy, queue }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("refreshThreads must retain the original typed Error");
    expect(result.stderr).toContain("refreshMessages must retain the original typed Error");
  });
  it("rejects acknowledgement validation disabled at the consumed decoder", () => {
    const result = runReader(({ hook, queue }) => ({ hook: changeOnce(hook, "requireSuccess: true", "requireSuccess: false") + legacyCopyDecoy, queue }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must consume the returned canonical typed readUiJson acknowledgement");
  });
  it("rejects a different surface classifier even when its names remain in comments", () => {
    const result = runReader(({ hook, queue }) => ({ hook: hook + legacyCopyDecoy, queue: changeOnce(queue, 'surface: "admin_truth", fallbackKey:', 'surface: "chat", fallbackKey:') + '// Canonical reference only: surface: "admin_truth"\n' }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("threadsError must reach the rendered canonical safe operator message");
    expect(result.stderr).toContain("messagesError must reach guarded reportClientIssue.detail.message");
  });
  it("rejects a disconnected list denial in the active guarded Debug reporter", () => {
    const result = runReader(({ hook, queue }) => ({ hook: hook + legacyCopyDecoy, queue: changeOnce(queue, 'message: getAdminSupportSafeErrorMessage(threadsError, "Support thread list failed."),', 'message: "Support thread list failed.", // getAdminSupportSafeErrorMessage(threadsError, "Support thread list failed.")') }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("threadsError must reach guarded reportClientIssue.detail.message");
  });
  it("rejects a same-named reporter imported from another owner", () => {
    const result = runReader(({ hook, queue }) => ({ hook: hook + legacyCopyDecoy, queue: changeOnce(queue, 'from "@/lib/client-error-reporting";', 'from "@/lib/unrelated-reporting";') }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("threadsError must reach guarded reportClientIssue.detail.message");
  });
  it("rejects raw message display while preserving disconnected safe calls in reporter code", () => {
    const result = runReader(({ hook, queue }) => ({ hook: hook + legacyCopyDecoy, queue: queue.replaceAll('{getAdminSupportSafeErrorMessage(threadsError, "Support thread list failed.")}', "{threadsError.message}").replaceAll('{getAdminSupportSafeErrorMessage(messagesError, "Support message detail failed.")}', "{messagesError.message}") }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("threadsError must reach the rendered canonical safe operator message");
    expect(result.stderr).toContain("messagesError must reach the rendered canonical safe operator message");
  });
  it("accepts equivalent canonical imports and local helper names", () => {
    const result = runReader(({ hook, queue }) => ({
      hook: hook.replaceAll("readAdminSupportJson", "decodeSupportResponse").replace('import { readUiJson }', 'import { readUiJson as decodeAdminResponse }').replace('return readUiJson<T>', 'return decodeAdminResponse<T>'),
      queue: queue.replace('import { resolveClientActionError }', 'import { resolveClientActionError as classifySupportRead }').replace('const safeError = resolveClientActionError(', 'const safeError = classifySupportRead(').replace('import { reportClientIssue }', 'import { reportClientIssue as reportSupportEvidence }').replaceAll('reportClientIssue({', 'reportSupportEvidence({'),
    }));
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });
});
