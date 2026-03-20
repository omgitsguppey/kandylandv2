import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { token, action } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;

    if (!projectId || !apiKey || !siteKey) {
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

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("reCAPTCHA assessment failed:", error);
    return NextResponse.json({ error: "Failed to verify reCAPTCHA" }, { status: 500 });
  }
}
