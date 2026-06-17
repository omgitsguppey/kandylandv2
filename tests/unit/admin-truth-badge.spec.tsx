import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";

describe("AdminTruthBadge", () => {
  const renderBadge = (state: Parameters<typeof AdminTruthBadge>[0]["state"]) =>
    renderToStaticMarkup(<AdminTruthBadge state={state} hasUsableValue />);

  it("does not expose unusable truth states as usable DOM evidence", () => {
    expect(renderBadge("unavailable")).toContain('data-admin-truth-has-usable-value="false"');
    expect(renderBadge("failed")).toContain('data-admin-truth-has-usable-value="false"');
    expect(renderBadge("blocked")).toContain('data-admin-truth-has-usable-value="false"');
  });

  it("preserves usable evidence markers for states that can expose values", () => {
    expect(renderBadge("cached")).toContain('data-admin-truth-has-usable-value="true"');
    expect(renderBadge("live")).toContain('data-admin-truth-has-usable-value="true"');
  });
});
