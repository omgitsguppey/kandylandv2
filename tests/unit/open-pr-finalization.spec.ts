import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(__dirname, "../..");

function read(path: string): string {
    return readFileSync(join(root, path), "utf8");
}

describe("open PR finalization contract", () => {
    it("keeps the notification prompt loading button screen-reader aware", () => {
        const banner = read("src/components/Dashboard/NotificationPromptBanner.tsx");

        expect(banner).toContain("aria-busy={loading}");
    });

    it("records every handled open PR without landing Jules scratch files", () => {
        expect(existsSync(join(root, "agent/state/open-pr-finalization.generated.json"))).toBe(true);
        expect(existsSync(join(root, "docs/agent-truth/open-pr-finalization.md"))).toBe(true);
        const changedFiles = execFileSync("git", ["diff", "--name-only", "HEAD"], { cwd: root, encoding: "utf8" });

        expect(changedFiles).not.toContain(".jules/sentinel.md");
        expect(changedFiles).not.toContain(".Jules/palette.md");
    });
});
