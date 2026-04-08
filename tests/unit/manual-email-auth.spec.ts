import { describe, expect, it, vi } from "vitest";

import {
    ensureManualSignupUsername,
    readManualRegistrationResult,
    resolveManualSignInIdentity,
} from "@/lib/manual-email-auth";

describe("manual email auth helpers", () => {
    it("resolves email identifiers through the manual sign-in lookup route", async () => {
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
            resolvedEmail: "fan@example.com",
            identifierType: "email",
        }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
            },
        }));

        const result = await resolveManualSignInIdentity("  fan@example.com  ", fetchMock);

        expect(result).toEqual({
            resolvedEmail: "fan@example.com",
            identifierType: "email",
        });
        expect(fetchMock).toHaveBeenCalledWith("/api/auth/manual-sign-in-lookup", expect.objectContaining({
            method: "POST",
        }));
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

    it("blocks manual sign-in when the account is Google-only", async () => {
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
            resolvedEmail: null,
            identifierType: "email",
            authErrorCode: "auth/use-google-sign-in",
        }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
            },
        }));

        await expect(resolveManualSignInIdentity("fan@example.com", fetchMock)).rejects.toMatchObject({
            code: "auth/use-google-sign-in",
        });
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
