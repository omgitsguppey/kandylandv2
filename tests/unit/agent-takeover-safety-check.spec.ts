import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateGeneratedChildReportEvidence } from "../../scripts/agent/generated-report-envelope";

import { checkCurrentTakeoverEvidence, decodeTakeoverTaskInput, listValidatorScopeFiles, readValidatorMutationScope, recordTakeoverEvidence, startTakeoverEvidence, TAKEOVER_REPORT_PATH, type TakeoverTaskInput, type BinaryAssetAddition } from "../../scripts/agent/validate-agent-takeover-safety-check";

const roots: string[] = [];
function fixture(memoryRequired = false, inheritedWork = false, binaryAsset?: BinaryAssetAddition | false, inheritedAsset?: Buffer) {
  const root = mkdtempSync(path.join(os.tmpdir(), "kd-takeover-evidence-"));
  roots.push(root);
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "ignore", shell: false });
  git("init", "--quiet");
  git("config", "user.name", "Takeover fixture");
  git("config", "user.email", "fixture@example.invalid");
  writeFileSync(path.join(root, ".gitignore"), "output/\n");
  writeFileSync(path.join(root, "AGENTS.md"), "Fixture authority: source checks only.\n");
  writeFileSync(path.join(root, "owner.ts"), "export const value = 1;\n");
  writeFileSync(path.join(root, "protected.ts"), "export const protectedValue = 1;\n");
  if (inheritedAsset) { mkdirSync(path.join(root, "public")); writeFileSync(path.join(root, "public/brand.png"), inheritedAsset); }
  git("add", ".");
  git("commit", "--quiet", "-m", "fixture baseline");
  if (inheritedWork) writeFileSync(path.join(root, "protected.ts"), "export const protectedValue = 2;\n");
  const input: TakeoverTaskInput = { taskKey: "takeover-test", activePromptLane: "source-tooling-fixture", goal: "Exercise actual current-task evidence and recovery.", authority: "Owned isolated source-tooling fixture.", allowedFiles: ["owner.ts", "REPO_MEMORY_LEDGER.md", ...(binaryAsset !== undefined ? ["public/brand.png"] : [])], forbiddenFiles: ["protected.ts"], inFlightLanes: ["sole fixture"], unknowns: ["No runtime/provider proof is requested."], memoryWriteback: { required: memoryRequired, evidencePath: "REPO_MEMORY_LEDGER.md", reason: "The fixture explicitly classifies whether its governance owner changes." }, releaseNoteImpact: "No release accepted.", justificationForNetAdditions: "Distinct scope and recovery fixture.", authorityFiles: ["AGENTS.md"], ...(binaryAsset ? { binaryAssetAdditions: [binaryAsset] } : {}) };
  const inputPath = "output/takeover-test/input.json";
  mkdirSync(path.dirname(path.join(root, inputPath)), { recursive: true });
  writeFileSync(path.join(root, inputPath), JSON.stringify(input, null, 2) + "\n");
  startTakeoverEvidence(inputPath, root);
  return { root, inputPath, input };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    if (!path.resolve(root).startsWith(path.join(path.resolve(os.tmpdir()), "kd-takeover-evidence-"))) throw new Error("Unexpected fixture cleanup target.");
    rmSync(root, { recursive: true, force: true });
  }
});

describe("Current takeover evidence through its real Git/file owner", () => {
  it("rejects a scoped passing child after an allowed same-HEAD source mutation and accepts restored bytes", () => {
    const { root, inputPath } = fixture();
    const mutationScope = readValidatorMutationScope(root, ["--task-input", inputPath])!;
    const report = { reportKey: "scoped-child", status: "pass", passed: true, currentHead: mutationScope.currentHead, sourceCommit: mutationScope.currentHead, generatedAtUtc: new Date().toISOString(), canClearSourceGate: true, validationFailures: [], mutationScope };
    const check = () => validateGeneratedChildReportEvidence({ report, expectedReportKey: "scoped-child", currentHead: mutationScope.currentHead, repositoryRoot: root, requireSourceGate: true });
    expect(check()).toEqual([]);
    writeFileSync(path.join(root, "owner.ts"), "export const value = 5;\n");
    expect(check()).toContain("scoped-child child scoped evidence must match current immutable input and source bytes.");
    writeFileSync(path.join(root, "owner.ts"), "export const value = 1;\n");
    expect(check()).toEqual([]);
  });
  it("delegates only explicit immutable task scope and rejects new protected mutations before recovering", () => {
    const { root, inputPath } = fixture(false, true);
    const args = ["--task-input", inputPath];
    expect(listValidatorScopeFiles(root, [])).toContain("protected.ts");
    expect(readValidatorMutationScope(root, [])).toBeNull();
    writeFileSync(path.join(root, "owner.ts"), "export const value = 4;\n");
    expect(readValidatorMutationScope(root, args)?.changedFiles).toEqual(["owner.ts"]);
    expect(listValidatorScopeFiles(root, args)).toEqual([]);
    writeFileSync(path.join(root, "protected.ts"), "export const protectedValue = 3;\n");
    expect(() => listValidatorScopeFiles(root, args)).toThrow("Output scope violation: protected.ts");
    writeFileSync(path.join(root, "protected.ts"), "export const protectedValue = 2;\n");
    expect(readValidatorMutationScope(root, args)?.changedFiles).toEqual(["owner.ts"]);
    expect(() => readValidatorMutationScope(root, ["--task-input"])).toThrow("immutable input path");
    expect(() => readValidatorMutationScope(root, [...args, "--task-input=" + inputPath])).toThrow("Exactly one");
    execFileSync("git", ["commit", "--allow-empty", "--quiet", "-m", "new revision"], { cwd: root });
    expect(() => readValidatorMutationScope(root, args)).toThrow("does not match current Git HEAD");
  });
  it("records measured allowed edits and passes all four lanes after reopening the record", () => {
    const { root, inputPath } = fixture();
    writeFileSync(path.join(root, "owner.ts"), "export const value = 2;\nexport const extra = true;\n");
    const report = recordTakeoverEvidence(inputPath, root);
    expect(report.output.changedFiles).toEqual(["owner.ts"]);
    expect(report.bloat.netAdditions).toBe(2);
    expect(report.bloat.netDeletions).toBe(1);
    expect(report.knowledge.betaDiagnosticScore).toEqual({ status: "missing", value: null });
    for (const lane of ["safety", "knowledge", "bloat", "output"] as const) expect(checkCurrentTakeoverEvidence(lane, root)).toEqual([]);
  });

  it("rejects same-HEAD mutation, preserves a report after failed refresh, and allows the next valid refresh", () => {
    const { root, inputPath } = fixture();
    recordTakeoverEvidence(inputPath, root);
    const destination = path.join(root, TAKEOVER_REPORT_PATH);
    const before = readFileSync(destination, "utf8");
    writeFileSync(path.join(root, "protected.ts"), "export const protectedValue = 2;\n");
    expect(checkCurrentTakeoverEvidence("output", root)).toContain("Takeover evidence does not match the current working tree.");
    expect(() => recordTakeoverEvidence(inputPath, root)).toThrow("Output scope violation: protected.ts");
    expect(readFileSync(destination, "utf8")).toBe(before);
    writeFileSync(path.join(root, "protected.ts"), "export const protectedValue = 1;\n");
    writeFileSync(path.join(root, "owner.ts"), "export const value = 3;\n");
    recordTakeoverEvidence(inputPath, root);
    expect(checkCurrentTakeoverEvidence("all", root)).toEqual([]);
  });

  it("cannot overwrite the baseline or change its allowlist to excuse an unexpected edit", () => {
    const { root, inputPath, input } = fixture();
    expect(() => startTakeoverEvidence(inputPath, root)).toThrow("Baseline already exists");
    writeFileSync(path.join(root, inputPath), JSON.stringify({ ...input, allowedFiles: ["owner.ts", "other.ts"] }));
    expect(() => readValidatorMutationScope(root, ["--task-input", inputPath])).toThrow("declared task input changed");
    expect(() => recordTakeoverEvidence(inputPath, root)).toThrow("declared task input changed");
    expect(() => decodeTakeoverTaskInput({ ...input, allowedFiles: ["protected.ts"] })).toThrow("Allowed/Forbidden overlap");
    expect(() => decodeTakeoverTaskInput({ ...input, unknowns: [] })).toThrow("nonempty unknowns");
  });

  it("rejects forged knowledge/bloat, expired evidence, and a historical schema", () => {
    const { root, inputPath } = fixture();
    const report = recordTakeoverEvidence(inputPath, root);
    const destination = path.join(root, TAKEOVER_REPORT_PATH);
    writeFileSync(destination, JSON.stringify({ ...report, knowledge: { ...report.knowledge, dirtySourceFileCount: 99 } }));
    expect(checkCurrentTakeoverEvidence("knowledge", root)).toContain("Knowledge dirty-source counts are not current Git observations.");
    writeFileSync(destination, JSON.stringify({ ...report, bloat: { ...report.bloat, netAdditions: 99 } }));
    expect(checkCurrentTakeoverEvidence("bloat", root)).toContain("Bloat counts differ from the retained source baseline.");
    writeFileSync(destination, JSON.stringify({ ...report, generatedAtUtc: "2026-05-28T20:50:00.000Z" }));
    expect(checkCurrentTakeoverEvidence("safety", root)).toContain("Takeover evidence is stale, future-dated, or missing its generation time.");
    writeFileSync(destination, JSON.stringify({ ...report, generatedAtUtc: new Date(Date.now() + 3_600_000).toISOString() }));
    expect(checkCurrentTakeoverEvidence("safety", root)).toContain("Takeover evidence is stale, future-dated, or missing its generation time.");
    writeFileSync(destination, JSON.stringify({ schemaVersion: 1, currentHead: report.currentHead }));
    expect(checkCurrentTakeoverEvidence("safety", root)).toContain("Historical takeover schema is not current task evidence; use --start and --record.");
  });

  it("rejects changed retained bytes instead of accepting invented addition/deletion counts", () => {
    const { root, inputPath } = fixture();
    const copy = path.join(root, "output/takeover-test/before/owner.ts.source");
    writeFileSync(copy, "Different baseline.\n");
    expect(() => recordTakeoverEvidence(inputPath, root)).toThrow("Retained baseline bytes are missing or changed: owner.ts");
    writeFileSync(copy, "export const value = 1;\n");
    recordTakeoverEvidence(inputPath, root);
    expect(checkCurrentTakeoverEvidence("all", root)).toEqual([]);
  });

  it("fails when authority changes and leaves required writeback pending until its durable owner changes", () => {
    const { root, inputPath } = fixture(true);
    expect(() => recordTakeoverEvidence(inputPath, root)).toThrow("Required memory writeback");
    writeFileSync(path.join(root, "REPO_MEMORY_LEDGER.md"), "Fixture governance lesson and its durable owner.\n");
    recordTakeoverEvidence(inputPath, root);
    writeFileSync(path.join(root, "AGENTS.md"), "Different authority.\n");
    expect(checkCurrentTakeoverEvidence("safety", root).join("\n")).toContain("Authority changed after the baseline");
  });

  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/g1sAAAAASUVORK5CYII=", "base64");
  const binaryPlan = (bytes = png, maxBytes = bytes.length): BinaryAssetAddition => ({file:"public/brand.png",mediaType:"image/png",sha256:createHash("sha256").update(bytes).digest("hex"),maxBytes,justification:"Owner-selected exact generated brand asset; reviewed source byte ceiling."});
  const addBinary = (root: string, bytes = png) => { mkdirSync(path.join(root,"public"),{recursive:true}); writeFileSync(path.join(root,"public/brand.png"),bytes); };

  it("records classified create-only PNG bytes separately, reopens proof, and rejects forged byte metrics", () => {
    const {root,inputPath}=fixture(false,false,binaryPlan());
    addBinary(root);writeFileSync(path.join(root,"owner.ts"),"export const value = 2;\nexport const extra = true;\n");
    const report=recordTakeoverEvidence(inputPath,root);
    expect(report.bloat).toMatchObject({netAdditions:2,netDeletions:1,binaryBytesAdded:png.length,binaryAssetAdditions:[{file:"public/brand.png",bytes:png.length,sha256:binaryPlan().sha256}]});
    expect(checkCurrentTakeoverEvidence("all",root)).toEqual([]);
    writeFileSync(path.join(root,TAKEOVER_REPORT_PATH),JSON.stringify({...report,bloat:{...report.bloat,binaryBytesAdded:0}}));
    expect(checkCurrentTakeoverEvidence("bloat",root)).toContain("Binary asset budget differs from the current exact bytes and immutable classification.");
    recordTakeoverEvidence(inputPath,root);expect(checkCurrentTakeoverEvidence("all",root)).toEqual([]);
  });

  it("keeps an unclassified allowed binary blocked before accepting the next original valid source", () => {
    const {root,inputPath}=fixture(false,false,false);recordTakeoverEvidence(inputPath,root);
    const retained=readFileSync(path.join(root,TAKEOVER_REPORT_PATH),"utf8");addBinary(root);
    expect(()=>recordTakeoverEvidence(inputPath,root)).toThrow("needs a separate budget classification");
    expect(readFileSync(path.join(root,TAKEOVER_REPORT_PATH),"utf8")).toBe(retained);
    rmSync(path.join(root,"public/brand.png"));recordTakeoverEvidence(inputPath,root);
    expect(checkCurrentTakeoverEvidence("all",root)).toEqual([]);
  });

  it.each([
    {name:"hash",plan:binaryPlan(Buffer.concat([png,Buffer.from([0])])),bytes:png},
    {name:"byte ceiling",plan:binaryPlan(png,png.length-1),bytes:png},
    {name:"PNG signature",plan:binaryPlan(Buffer.alloc(16)),bytes:Buffer.alloc(16)},
  ])("rejects a classified binary with wrong $name and preserves the previous report", ({plan,bytes}) => {
    const {root,inputPath}=fixture(false,false,plan);recordTakeoverEvidence(inputPath,root);
    const retained=readFileSync(path.join(root,TAKEOVER_REPORT_PATH),"utf8");addBinary(root,bytes);
    expect(()=>recordTakeoverEvidence(inputPath,root)).toThrow("Binary PNG bytes, hash or byte ceiling disagree");
    expect(readFileSync(path.join(root,TAKEOVER_REPORT_PATH),"utf8")).toBe(retained);
  });

  it("rejects replacement of inherited PNG bytes under an addition-only declaration", () => {
    const next=Buffer.concat([png,Buffer.from([0])]);const {root,inputPath}=fixture(false,false,binaryPlan(next),png);
    addBinary(root,next);expect(()=>recordTakeoverEvidence(inputPath,root)).toThrow("create-only PNG addition");
  });

  it("rejects malformed or scope-disconnected binary declarations before baselining", () => {
    const {input}=fixture(false,false,binaryPlan());
    for(const plan of [{...binaryPlan(),file:"protected.ts"},{...binaryPlan(),mediaType:"application/octet-stream"},{...binaryPlan(),maxBytes:NaN},{...binaryPlan(),sha256:"unreviewed"},{...binaryPlan(),justification:""}])
      expect(()=>decodeTakeoverTaskInput({...input,binaryAssetAdditions:[plan]})).toThrow("one exact allowed public PNG");
    expect(()=>decodeTakeoverTaskInput({...input,binaryAssetAdditions:[binaryPlan(),binaryPlan()]})).toThrow("one exact allowed public PNG");
    expect(()=>decodeTakeoverTaskInput({...input,binaryAssetAdditions:[]})).toThrow("nonempty reviewed classification");
  });

});
