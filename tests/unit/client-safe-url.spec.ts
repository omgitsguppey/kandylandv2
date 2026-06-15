import { describe, expect, it } from "vitest";

import { resolveSameOriginRelativePath } from "@/lib/client-safe-url";

const ORIGIN = "https://kandydrops.invalid";

describe("resolveSameOriginRelativePath", () => {
  it("keeps same-origin app paths relative", () => {
    expect(resolveSameOriginRelativePath("/api/admin?tab=users#top", ORIGIN)).toBe("/api/admin?tab=users#top");
    expect(resolveSameOriginRelativePath("dashboard/profile", ORIGIN)).toBe("/dashboard/profile");
    expect(resolveSameOriginRelativePath(`${ORIGIN}/experiences`, ORIGIN)).toBe("/experiences");
  });

  it("blocks cross-origin and protocol-relative URL smuggling", () => {
    expect(resolveSameOriginRelativePath("https://evil.com/api", ORIGIN)).toBeNull();
    expect(resolveSameOriginRelativePath("//evil.com/api", ORIGIN)).toBeNull();
    expect(resolveSameOriginRelativePath("\\\\evil.com\\api", ORIGIN)).toBeNull();
    expect(resolveSameOriginRelativePath("/\\evil.com/api", ORIGIN)).toBeNull();
  });

  it("blocks same-origin absolute URLs whose resolved pathname starts protocol-relative", () => {
    expect(resolveSameOriginRelativePath(`${ORIGIN}//evil.com`, ORIGIN)).toBeNull();
    expect(resolveSameOriginRelativePath(`${ORIGIN}/\\evil.com`, ORIGIN)).toBeNull();
  });
});
