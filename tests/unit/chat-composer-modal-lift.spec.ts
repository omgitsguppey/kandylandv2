import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { evaluateChatComposerModalScope } from "../../scripts/agent/validate-chat-composer-modal-lift";

const REPORT_PATH = "agent/state/chat-composer-modal-lift.generated.json";
const COMPONENT_PATH = "src/components/Chat/ChatExperience.tsx";

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
  }, 20_000);

  it("scopes regression checks to the modal while retaining concrete misuse failures", () => {
    const source = readFileSync(COMPONENT_PATH, "utf8");

    expect(evaluateChatComposerModalScope(source)).toEqual({
      bottomNavUntouched: true,
      topNavUntouched: true,
      chatFunctionsUntouched: true,
      creatorPickerLogicUntouched: true,
      paymentWalletGumdropUntouched: true,
    });
    expect(evaluateChatComposerModalScope(`authFetch(\"/api/chat/elsewhere\");\n${source}`)).toEqual({
      bottomNavUntouched: true,
      topNavUntouched: true,
      chatFunctionsUntouched: true,
      creatorPickerLogicUntouched: true,
      paymentWalletGumdropUntouched: true,
    });

    const modalChatMutation = source.replace(
      'data-chat-new-message-modal="true"',
      'data-chat-new-message-modal="true" data-test-contract="authFetch("',
    );
    expect(evaluateChatComposerModalScope(modalChatMutation).chatFunctionsUntouched).toBe(false);

    const modalPaymentMutation = source.replace(
      'data-chat-new-message-modal="true"',
      'data-chat-new-message-modal="true" data-test-contract="wallet payment"',
    );
    expect(evaluateChatComposerModalScope(modalPaymentMutation).paymentWalletGumdropUntouched).toBe(false);

    const modalNavMutation = source.replace(
      'data-chat-new-message-modal="true"',
      'data-chat-new-message-modal="true" data-test-contract="BottomNav"',
    );
    expect(evaluateChatComposerModalScope(modalNavMutation).bottomNavUntouched).toBe(false);

    const disconnectedCreatorPicker = source.replace(
      "openThreadComposer(creator.uid)",
      "setComposePickerOpen(false)",
    );
    expect(evaluateChatComposerModalScope(disconnectedCreatorPicker).creatorPickerLogicUntouched).toBe(false);
  });
});
