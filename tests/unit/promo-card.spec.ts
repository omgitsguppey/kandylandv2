import { describe, expect, it } from "vitest";

import { getSafeUrl } from "@/components/PromoCard";

describe("getSafeUrl", () => {
  it("allows http, https, and relative promo destinations", () => {
    expect(getSafeUrl("https://example.com/promo?ref=1")).toBe("https://example.com/promo?ref=1");
    expect(getSafeUrl("http://localhost:3000/local-offer")).toBe("http://localhost:3000/local-offer");
    expect(getSafeUrl("/drops/spring-promo")).toBe("/drops/spring-promo");
  });

  it("blocks protocol-relative open redirect URLs", () => {
    expect(getSafeUrl("https://kandydrops.invalid//evil.com")).toBeUndefined();
    expect(getSafeUrl("https://kandydrops.invalid/\\evil.com")).toBeUndefined();
  });

  it("blocks script-bearing and control-character-obfuscated URLs", () => {
    expect(getSafeUrl("javascript:alert(1)")).toBeUndefined();
    expect(getSafeUrl("java\nscript:alert(1)")).toBeUndefined();
    expect(getSafeUrl(" data:text/html,<svg/onload=alert(1)>")).toBeUndefined();
    expect(getSafeUrl("vbscript:msgbox('xss')")).toBeUndefined();
  });
});
