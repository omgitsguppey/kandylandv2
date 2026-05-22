import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const REPORT_PATH = "agent/state/chat-composer-modal-lift.generated.json";

describe("chat composer modal lift", () => {
  it("validates the new message modal bottom-nav lift, glass skin, and protected chat logic boundary", () => {
    execSync("npm run check:chat-composer-modal-lift", { encoding: "utf8", stdio: "pipe" });

    const report = JSON.parse(readFileSync(REPORT_PATH, "utf8"));

    expect(report.status).toBe("pass");
    expect(report.modalComponent).toBe("src/components/Chat/ChatExperience.tsx");
    expect(report.bottomNavUntouched).toBe(true);
    expect(report.topNavUntouched).toBe(true);
    expect(report.chatFunctionsUntouched).toBe(true);
    expect(report.creatorPickerLogicUntouched).toBe(true);
    expect(report.checks).toMatchObject({
      modalHasRequiredDataAttrs: true,
      modalUsesBottomNavSafeOffset: true,
      modalHasInternalBottomPadding: true,
      modalUsesBlackFrostedGlassSkin: true,
      modalAvoidsLightGrayPanel: true,
      mobileSafeAreaHandlingExists: true,
    });
    expect(report.validationFailures).toEqual([]);
  });
});
