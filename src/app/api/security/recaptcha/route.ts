import { NextRequest, NextResponse } from "next/server";
import { STRICT } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";

export async function POST(request: NextRequest) {
  try {
    await guardApiRequest(request, {
      routeName: "security/recaptcha",
      rateLimit: STRICT,
      requireTrustedOrigin: true,
    });

    const { token, action } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;

    if (!projectId || !apiKey || !siteKey) {
      await recordServerDiagnostic({
        channel: "firebase",
        severity: "error",
        message: "Missing reCAPTCHA server config",
        detail: {
          route: "security/recaptcha",
          hasProjectId: Boolean(projectId),
          hasApiKey: Boolean(apiKey),
          hasSiteKey: Boolean(siteKey),
        },
      });
      return NextResponse.json({ error: "Missing reCAPTCHA server config" }, { status: 500 });
    }

    const assessmentUrl = `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${apiKey}`;

    const assessmentPayload = {
      event: {
        token: token,
        expectedAction: action || "USER_ACTION",
        siteKey: siteKey,
      }
    };

    const response = await fetch(assessmentUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(assessmentPayload),
    });

    if (!response.ok) {
      await recordServerDiagnostic({
        channel: "firebase",
        severity: response.status >= 500 ? "error" : "warn",
        message: "reCAPTCHA assessment returned a non-success response",
        detail: {
          route: "security/recaptcha",
          status: response.status,
          action: typeof action === "string" ? action : "USER_ACTION",
        },
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("reCAPTCHA assessment failed:", error);
    await recordServerDiagnostic({
      channel: "firebase",
      severity: "error",
      message: "reCAPTCHA assessment failed",
      detail: {
        route: "security/recaptcha",
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return NextResponse.json({ error: "Failed to verify reCAPTCHA" }, { status: 500 });
  }
}
