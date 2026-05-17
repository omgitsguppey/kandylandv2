// @vitest-environment happy-dom

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/Analytics/PageViewEvent", () => ({
  PageViewEvent: () => null,
}));

import LegacyCreatorSettingsPage from "@/app/dashboard/profile/creator/page";

describe("LegacyCreatorSettingsPage", () => {
  it("shows the migration notice and creator settings CTA", () => {
    const markup = renderToStaticMarkup(<LegacyCreatorSettingsPage />);

    expect(markup).toContain("Creator settings now live in Creator Settings.");
    expect(markup).toContain("Open Creator Settings");
    expect(markup).toContain("/dashboard/creator/settings");
  });
});
