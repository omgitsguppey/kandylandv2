import { afterAll, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { gcloudSurface, runCommand, type CommandResult } from "../../scripts/agent/verify-codex-native-auth";

const fixtureRoot = mkdtempSync(path.join(tmpdir(), "kd-auth-command-"));
const wrapper = path.join(fixtureRoot, "auth ' wrapper.ps1");
writeFileSync(wrapper, "\uFEFFif ($args[0] -eq 'fail') { exit 23 }\nif ($args[0] -eq 'wait') { Start-Sleep -Seconds 5 }\nConvertTo-Json -InputObject @($args) -Compress\nexit 0\n");

afterAll(() => {
  if (path.dirname(fixtureRoot) !== tmpdir() || !path.basename(fixtureRoot).startsWith("kd-auth-command-")) {
    throw new Error("Unexpected auth fixture cleanup target");
  }
  rmSync(fixtureRoot, { recursive: true, force: true });
});

describe("read-only auth command launcher", () => {
  it("preserves a command failure without invoking it twice", () => {
    const counter = path.join(fixtureRoot, "attempts.txt");
    const command = `require('node:fs').appendFileSync(${JSON.stringify(counter)}, 'called\\n'); process.exit(23)`;
    const result = runCommand(process.execPath, ["-e", command]);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(23);
    expect(result.toolMissing).toBe(false);
    expect(readFileSync(counter, "utf8")).toBe("called\n");
  });

  it.runIf(process.platform === "win32")("launches a real script wrapper and preserves arguments as literal data", () => {
    const values = ["normal", "two words", "'quoted'", "$([Console]::WriteLine('injected'))", "a;b&c", "déjà 👁"];
    const result = runCommand(wrapper, values);

    expect(result.ok, result.stderr).toBe(true);
    expect(JSON.parse(result.stdout)).toEqual(values);
  });

  it("reports an absent executable without claiming access", () => {
    const result = runCommand(path.join(fixtureRoot, "missing-auth-tool"), ["--version"]);

    expect(result.ok).toBe(false);
    expect(result.toolMissing).toBe(true);
    expect(result.timedOut).toBe(false);
  });

  it.runIf(process.platform === "win32")("keeps wrapper failure and timeout distinct and permits the next valid probe", () => {
    const failed = runCommand(wrapper, ["fail"]);
    const timedOut = runCommand(wrapper, ["wait"], 1500);
    const recovered = runCommand(wrapper, ["recovered"]);

    expect(failed.status).toBe(23);
    expect(failed.toolMissing).toBe(false);
    expect(timedOut.ok).toBe(false);
    expect(timedOut.timedOut).toBe(true);
    expect(timedOut.toolMissing).toBe(false);
    expect(recovered.ok, recovered.stderr).toBe(true);
    expect(JSON.parse(recovered.stdout)).toEqual(["recovered"]);
  });

  it.runIf(process.platform === "win32")("rejects batch metacharacters before the wrapper executes", () => {
    const batch = path.join(fixtureRoot, "auth batch.cmd");
    writeFileSync(batch, "@echo off\r\necho executed\r\n");
    const rejected = runCommand(batch, ["value&echo injected"]);
    const valid = runCommand(batch, ["--format=json"]);

    expect(rejected.ok).toBe(false);
    expect(rejected.status).toBe(64);
    expect(rejected.stdout.trim()).toBe("");
    expect(valid.ok, valid.stderr).toBe(true);
    expect(valid.stdout.trim()).toBe("executed");
  });
});

describe("explicit cloud project capability", () => {
  const projectId = "kandydrops-by-ikandy";
  const answer = (args: string[], value: unknown, ok = true): CommandResult => ({
    command: ["gcloud", ...args].join(" "), ok, status: ok ? 0 : 1,
    stdout: JSON.stringify(value), stderr: ok ? "" : "PERMISSION_DENIED",
    timedOut: false, toolMissing: false,
  });
  const runner = (returnedProject: string, permitted = true) => {
    const calls: string[][] = [];
    const execute = (_tool: string, args: string[]) => {
      calls.push(args);
      if (args[0] === "auth") return answer(args, [{ account: "fixture@example.invalid", status: "ACTIVE" }]);
      if (args[0] === "projects") return answer(args, { projectId: returnedProject }, permitted);
      return answer(args, []);
    };
    return { calls, execute };
  };

  it("verifies the requested project without changing or requiring the global default", () => {
    const fixture = runner(projectId);
    const result = gcloudSurface(projectId, fixture.execute);

    expect(result.status).toBe("ok");
    expect(result.canRead).toBe(true);
    expect(result.projectId).toBe(projectId);
    expect(fixture.calls).toContainEqual(["projects", "describe", projectId, "--format=json"]);
    expect(fixture.calls).toContainEqual(["services", "list", "--enabled", "--project", projectId, "--format=json"]);
    expect(fixture.calls.some((args) => args[0] === "config")).toBe(false);
    expect(result.canMutateProduction).toBe(false);
  });

  it("denies a mismatched identity or permission failure before service reads, then recovers", () => {
    const mismatch = runner("different-project");
    const denied = runner(projectId, false);
    expect(gcloudSurface(projectId, mismatch.execute).status).toBe("wrong_project");
    expect(gcloudSurface(projectId, denied.execute).status).toBe("insufficient_scope");
    expect([...mismatch.calls, ...denied.calls].some((args) => args[0] === "services")).toBe(false);
    expect(gcloudSurface(projectId, runner(projectId).execute).canRead).toBe(true);
  });
});
