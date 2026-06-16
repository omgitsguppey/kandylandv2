import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("Admin Analytics Auth Outcomes mobile contract", () => {
  const source = readFileSync(
    join(process.cwd(), "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx"),
    "utf8",
  );

  it("renders compact no-sample auth state instead of metric-card spam", () => {
    expect(source).toContain("authHasUsableSample");
    expect(source).toContain("No auth sample yet");
    expect(source).toContain("Next source step: run bounded email/password and Google login attempts, then refresh.");
    expect(source).toContain("!authHasUsableSample");
    expect(source).toContain("authCanRenderDetails");
  });

  it("does not render five metric cards unless a usable auth sample exists", () => {
    const authSection = source.slice(
      source.indexOf('title="Auth Outcomes"'),
      source.indexOf("<AdminOnboardingAnalyticsModules"),
    );

    expect(authSection).toContain('className="hidden grid-cols-2 gap-2 md:grid lg:grid-cols-5"');
    expect(authSection).toContain("authOutcomeModel.methodBreakdown.map");
    expect(authSection).toContain("authCanRenderDetails ?");
    expect(authSection).toContain('className="mt-2 md:hidden"');
    expect(authSection).toContain('className="mt-2 hidden rounded-[1rem] border border-white/10 bg-black/30 p-2.5 md:block md:p-3"');
  });

  it("exposes tracking truth data attrs and avoids raw failure-code unavailable copy", () => {
    expect(source).toContain("data-admin-analytics-auth-hydration-state");
    expect(source).toContain("data-admin-analytics-auth-measurement-mode");
    expect(source).toContain("data-admin-analytics-auth-exact-chain-available");
    expect(source).toContain("data-admin-analytics-auth-failure-reasons-available");
    expect(source).toContain("data-admin-analytics-auth-next-source-step");
    expect(source).toContain("Failure reason not captured");
    expect(source).not.toContain("failure_code_unavailable}");
    expect(source).not.toContain("Manual:");
  });
});
