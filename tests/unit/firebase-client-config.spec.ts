import { afterEach, describe, expect, it, vi } from "vitest";

type RuntimeConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  databaseURL?: string;
  messagingSenderId?: string;
  appId?: string;
};

async function loadFirebaseModule(runtimeConfig: RuntimeConfig) {
  vi.resetModules();

  const initializeApp = vi.fn(() => ({ name: "app" }));
  const getApps = vi.fn(() => []);
  const getApp = vi.fn(() => ({ name: "existing-app" }));
  const getAuth = vi.fn(() => ({ name: "auth" }));
  const initializeAppCheck = vi.fn();
  const ReCaptchaEnterpriseProvider = vi.fn();
  const recordClientDiagnostic = vi.fn();

  vi.doMock("firebase/app", () => ({
    initializeApp,
    getApps,
    getApp,
  }));

  vi.doMock("firebase/auth", () => ({
    getAuth,
  }));

  vi.doMock("firebase/app-check", () => ({
    initializeAppCheck,
    ReCaptchaEnterpriseProvider,
  }));

  vi.doMock("@/lib/client-diagnostics", () => ({
    recordClientDiagnostic,
  }));

  vi.doMock("@/lib/firebase-runtime", () => ({
    getFirebaseClientConfigForRuntime: vi.fn(() => runtimeConfig),
    FIREBASE_RECAPTCHA_ENTERPRISE_SITE_KEY: undefined,
    IS_DEVELOPMENT_ENV: false,
    getFirebaseRuntimeWarnings: vi.fn(() => []),
  }));

  const firebaseModule = await import("@/lib/firebase");

  return {
    firebaseModule,
    mocks: {
      initializeApp,
      getApps,
      getApp,
      getAuth,
      initializeAppCheck,
      ReCaptchaEnterpriseProvider,
      recordClientDiagnostic,
    },
  };
}

describe("firebase client config fallback", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses an empty non-secret config when runtime values are missing", async () => {
    const { firebaseModule, mocks } = await loadFirebaseModule({});

    expect(firebaseModule.EMPTY_FIREBASE_CLIENT_CONFIG).toEqual({
      apiKey: "",
      authDomain: "",
      projectId: "",
      storageBucket: "",
      databaseURL: "",
      messagingSenderId: "",
      appId: "",
    });
    expect(firebaseModule.normalizeFirebaseClientConfig()).toEqual({
      isConfigured: false,
      config: firebaseModule.EMPTY_FIREBASE_CLIENT_CONFIG,
    });
    expect(firebaseModule.firebaseClientConfigured).toBe(false);
    expect(firebaseModule.auth).toBeNull();
    expect(mocks.initializeApp).toHaveBeenCalledWith(firebaseModule.EMPTY_FIREBASE_CLIENT_CONFIG);
    expect(mocks.getAuth).not.toHaveBeenCalled();
    expect(firebaseModule.EMPTY_FIREBASE_CLIENT_CONFIG.apiKey).not.toMatch(/^AIza[0-9A-Za-z_-]{20,}$/u);
  });

  it("trims configured runtime values and derives missing defaults from project id", async () => {
    const runtimeConfig = {
      apiKey: "  public-client-key  ",
      projectId: "  kandydrops-prod  ",
      appId: "  1:123:web:abc  ",
      databaseURL: "  https://custom-db.example.com  ",
    };

    const { firebaseModule, mocks } = await loadFirebaseModule(runtimeConfig);

    expect(firebaseModule.normalizeFirebaseClientConfig()).toEqual({
      isConfigured: true,
      config: {
        apiKey: "public-client-key",
        authDomain: "kandydrops-prod.firebaseapp.com",
        projectId: "kandydrops-prod",
        storageBucket: "kandydrops-prod.appspot.com",
        databaseURL: "https://custom-db.example.com",
        messagingSenderId: "000000000000",
        appId: "1:123:web:abc",
      },
    });
    expect(firebaseModule.firebaseClientConfigured).toBe(true);
    expect(mocks.getAuth).toHaveBeenCalledTimes(1);
  });
});
