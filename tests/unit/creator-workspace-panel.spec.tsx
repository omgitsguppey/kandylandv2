import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/context/AdminViewAsContext", () => ({
    useAdminViewAs: () => ({ viewAsState: null }),
}));

import { CreatorWorkspacePanel } from "@/components/Dashboard/CreatorWorkspacePanel";

describe("CreatorWorkspacePanel", () => {
    it("renders the creator subscriptions module in the workspace shell", () => {
        const markup = renderToStaticMarkup(
            <CreatorWorkspacePanel
                userProfile={{
                    uid: "creator_1",
                    role: "creator",
                    displayName: "Creator One",
                    creatorApplication: undefined,
                } as any}
            />,
        );

        expect(markup).toContain("Fan Pass CRM");
        expect(markup).toContain("No subscriber rows are active yet.");
    });
});
