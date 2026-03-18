function normalizePublicEnv(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function buildDefaultDatabaseUrl(projectId: string | undefined) {
  return projectId ? `https://${projectId}-default-rtdb.firebaseio.com` : undefined;
}

export const IS_PRODUCTION_ENV = process.env.NODE_ENV === "production";
export const IS_DEVELOPMENT_ENV = process.env.NODE_ENV === "development";
export const FIREBASE_API_KEY = normalizePublicEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
export const FIREBASE_AUTH_DOMAIN = normalizePublicEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
export const FIREBASE_PROJECT_ID = normalizePublicEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
export const FIREBASE_STORAGE_BUCKET = normalizePublicEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
  ?? (FIREBASE_PROJECT_ID ? `${FIREBASE_PROJECT_ID}.appspot.com` : undefined);
export const FIREBASE_DATABASE_URL = normalizePublicEnv(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL)
  ?? buildDefaultDatabaseUrl(FIREBASE_PROJECT_ID);
export const FIREBASE_MESSAGING_SENDER_ID = normalizePublicEnv(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID);
export const FIREBASE_APP_ID = normalizePublicEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID);
export const FIREBASE_VAPID_KEY = normalizePublicEnv(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY);
export const FIREBASE_RECAPTCHA_ENTERPRISE_SITE_KEY = normalizePublicEnv(
  process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY,
);

export function shouldRequireAppCheck() {
  return IS_PRODUCTION_ENV && Boolean(FIREBASE_RECAPTCHA_ENTERPRISE_SITE_KEY);
}

export const FIREBASE_CLIENT_CONFIG = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  databaseURL: FIREBASE_DATABASE_URL,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};

export const FIREBASE_MESSAGING_CONFIG = {
  apiKey: FIREBASE_API_KEY,
  projectId: FIREBASE_PROJECT_ID,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};
