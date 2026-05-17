import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { HUMAN_ERROR_DICTIONARY, REQUIRED_HUMAN_ERROR_KEYS } from "@/lib/errors/error-dictionary";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("error language contract", () => {
  it("covers required product error keys", () => {
    for (const key of REQUIRED_HUMAN_ERROR_KEYS) {
      expect(HUMAN_ERROR_DICTIONARY[key], key).toBeTruthy();
    }
  });

  it("keeps user messages free of raw developer/provider wording", () => {
    const forbiddenUserCopy = /\b(Firebase|Zod|JSON\.parse|stack|Internal server error|PayPal|SyntaxError|Error:|bookingStartAt)\b/i;

    for (const descriptor of Object.values(HUMAN_ERROR_DICTIONARY)) {
      expect(descriptor.userMessage, descriptor.errorKey).not.toMatch(forbiddenUserCopy);
      expect(descriptor.userTitle.length, descriptor.errorKey).toBeGreaterThan(0);
      expect(descriptor.operatorMessage.length, descriptor.errorKey).toBeGreaterThan(0);
    }
  });

  it("pins critical copy requirements", () => {
    expect(HUMAN_ERROR_DICTIONARY.internal_server_error.bugReportEligible).toBe(true);
    expect(HUMAN_ERROR_DICTIONARY.insufficient_paid_gumdrops.userMessage).toContain("paid GumDrops");
    expect(HUMAN_ERROR_DICTIONARY.insufficient_paid_gumdrops.userMessage).toContain("not reward balance");
    expect(HUMAN_ERROR_DICTIONARY.slot_unavailable.userMessage).toMatch(/pick another/i);
  });

  it("keeps bug-report action support in the descriptor shape", () => {
    const source = readSource("src/lib/errors/error-language.ts");
    expect(source).toContain('"submit_bug"');
    expect(source).toContain("bugReportEligible");
    expect(source).toContain("rewardEligible");
  });

  it("does not directly return raw error messages from the resolver", () => {
    const resolver = readSource("src/lib/errors/resolve-human-error.ts");
    expect(resolver).not.toContain("return error.message");
    expect(resolver).not.toContain("return String(error)");
  });
});
