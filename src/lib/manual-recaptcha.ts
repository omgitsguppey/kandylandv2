import { FIREBASE_RECAPTCHA_ENTERPRISE_SITE_KEY } from "@/lib/firebase-runtime";

export async function verifyManualRecaptchaToken(action: string = "LOGIN") {
  if (typeof window === "undefined") {
    throw new Error("Cannot execute reCAPTCHA on the server.");
  }

  const recaptcha = (window as any).grecaptcha;
  if (!recaptcha || !recaptcha.enterprise) {
    throw new Error("reCAPTCHA script is not loaded in the browser. Are you sure Firebase App Check loaded it?");
  }

  const siteKey = FIREBASE_RECAPTCHA_ENTERPRISE_SITE_KEY;
  if (!siteKey) {
    throw new Error("reCAPTCHA site key is missing from environment.");
  }

  return new Promise<any>((resolve, reject) => {
    recaptcha.enterprise.ready(async () => {
      try {
        const token = await recaptcha.enterprise.execute(siteKey, { action });
        
        const response = await fetch("/api/security/recaptcha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, action }),
        });
        
        const result = await response.json();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}
