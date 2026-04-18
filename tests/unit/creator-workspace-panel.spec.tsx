import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

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

        expect(markup).toContain("Subscribers");
        expect(markup).toContain("No subscriber rows are active yet.");
    });
});
