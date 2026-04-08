import { describe, expect, it, vi } from "vitest";

import {
    ensureManualSignupUsername,
    readManualRegistrationResult,
    resolveManualSignInIdentity,
} from "@/lib/manual-email-auth";

describe("manual email auth helpers", () => {
    it("passes email identifiers through without a lookup request", async () => {
        const fetchMock = vi.fn<typeof fetch>();

        const result = await resolveManualSignInIdentity("  fan@example.com  ", fetchMock);

        expect(result).toEqual({
            resolvedEmail: "fan@example.com",
            identifierType: "email",
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("resolves username identifiers through the manual sign-in lookup route", async () => {
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
            resolvedEmail: "fan@example.com",
            identifierType: "username",
        }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
            },
        }));

        const result = await resolveManualSignInIdentity("Fan One", fetchMock);

        expect(result).toEqual({
            resolvedEmail: "fan@example.com",
            identifierType: "username",
        });
        expect(fetchMock).toHaveBeenCalledWith("/api/auth/manual-sign-in-lookup", expect.objectContaining({
            method: "POST",
        }));
    });

    it("fails manual signup when the requested username is unavailable", async () => {
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
            normalized: "fan-one",
            available: false,
        }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
            },
        }));

        await expect(ensureManualSignupUsername("Fan One", fetchMock)).rejects.toMatchObject({
            code: "auth/username-already-in-use",
        });
    });

    it("maps registration conflicts to a username auth error", async () => {
        const response = new Response(JSON.stringify({
            error: "Username is already taken.",
        }), {
            status: 409,
            headers: {
                "Content-Type": "application/json",
            },
        });

        await expect(readManualRegistrationResult(response)).rejects.toMatchObject({
            code: "auth/username-already-in-use",
        });
    });
});
