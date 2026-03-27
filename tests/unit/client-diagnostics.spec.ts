import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  readClientDiagnostics,
  readClientBreadcrumbs,
  readClientErrors,
  recordClientDiagnostic,
  recordClientBreadcrumb,
  recordClientError,
  clearClientDiagnostics,
  getClientDebugSnapshot,
  installClientDiagnosticsBridge,
} from "@/lib/client-diagnostics";

const DIAGNOSTIC_STORAGE_KEY = "kandydrops.clientDiagnostics";
const BREADCRUMB_STORAGE_KEY = "kandydrops.clientBreadcrumbs";
const ERROR_STORAGE_KEY = "kandydrops.clientErrors";

describe("client-diagnostics", () => {
  let localStorageData: Record<string, string> = {};

  beforeEach(() => {
    localStorageData = {};
    const getItem = vi.fn((key: string) => localStorageData[key] || null);
    const setItem = vi.fn((key: string, value: string) => {
      localStorageData[key] = value;
    });
    const removeItem = vi.fn((key: string) => {
      delete localStorageData[key];
    });

    vi.stubGlobal("window", {
      localStorage: { getItem, setItem, removeItem },
      location: { pathname: "/test", search: "?q=1" },
      innerWidth: 1024,
      innerHeight: 768,
      navigator: { userAgent: "test-agent" },
      addEventListener: vi.fn(),
    });

    vi.stubGlobal("document", {
      addEventListener: vi.fn(),
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date(1000000));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("read/write diagnostics", () => {
    it("returns empty array when nothing is stored", () => {
      expect(readClientDiagnostics()).toEqual([]);
    });

    it("records and reads diagnostics", () => {
      recordClientDiagnostic("telemetry", "Test message", { foo: "bar" }, "info");

      const diagnostics = readClientDiagnostics();
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]).toMatchObject({
        channel: "telemetry",
        severity: "info",
        message: "Test message",
        detail: JSON.stringify({ foo: "bar" }),
        timestamp: 1000000,
      });
    });

    it("truncates detail string if it is too long", () => {
      const longString = "a".repeat(1000);
      recordClientDiagnostic("telemetry", "Test", longString);

      const diagnostics = readClientDiagnostics();
      expect(diagnostics[0].detail?.length).toBe(800);
    });

    it("truncates message if it is too long", () => {
      const longMessage = "a".repeat(500);
      recordClientDiagnostic("telemetry", longMessage);

      const diagnostics = readClientDiagnostics();
      expect(diagnostics[0].message.length).toBe(240);
    });

    it("limits the number of stored diagnostics", () => {
      for (let i = 0; i < 150; i++) {
        recordClientDiagnostic("telemetry", `Message ${i}`);
      }

      const diagnostics = readClientDiagnostics();
      expect(diagnostics).toHaveLength(120);
      expect(diagnostics[0].message).toBe("Message 30"); // 150 - 120
      expect(diagnostics[119].message).toBe("Message 149");
    });
  });

  describe("read/write breadcrumbs", () => {
    it("records and reads breadcrumbs", () => {
      recordClientBreadcrumb("interaction", "Click button", { tag: "button" });

      const breadcrumbs = readClientBreadcrumbs();
      expect(breadcrumbs).toHaveLength(1);
      expect(breadcrumbs[0]).toMatchObject({
        category: "interaction",
        label: "Click button",
        path: "/test",
        detail: JSON.stringify({ tag: "button" }),
        timestamp: 1000000,
      });
    });

    it("limits the number of stored breadcrumbs", () => {
      for (let i = 0; i < 80; i++) {
        recordClientBreadcrumb("route", `Route ${i}`);
      }

      const breadcrumbs = readClientBreadcrumbs();
      expect(breadcrumbs).toHaveLength(60);
      expect(breadcrumbs[0].label).toBe("Route 20");
    });
  });

  describe("read/write errors", () => {
    it("records and reads errors", () => {
      const error = new Error("Test error");
      error.stack = "Error: Test error\n  at something";

      recordClientError(error, { source: "test", componentStack: "Div > Span" });

      const errors = readClientErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        message: "Test error",
        stack: "Error: Test error\n  at something",
        path: "/test",
        componentStack: "Div > Span",
        timestamp: 1000000,
      });

      // Also records diagnostic and breadcrumb
      const diagnostics = readClientDiagnostics();
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].channel).toBe("error");

      const breadcrumbs = readClientBreadcrumbs();
      expect(breadcrumbs).toHaveLength(1);
      expect(breadcrumbs[0].category).toBe("error");
    });

    it("handles string errors", () => {
      recordClientError("String error message");
      const errors = readClientErrors();
      expect(errors[0].message).toBe("String error message");
    });

    it("limits the number of stored errors", () => {
      for (let i = 0; i < 30; i++) {
        recordClientError(`Error ${i}`);
      }

      const errors = readClientErrors();
      expect(errors).toHaveLength(24);
      expect(errors[0].message).toBe("Error 6");
    });
  });

  describe("clearClientDiagnostics", () => {
    it("clears all storage keys", () => {
      recordClientDiagnostic("telemetry", "Test");
      recordClientBreadcrumb("route", "Test");
      recordClientError("Test");

      expect(readClientDiagnostics().length).toBeGreaterThan(0);
      expect(readClientBreadcrumbs().length).toBeGreaterThan(0);
      expect(readClientErrors().length).toBe(1);

      clearClientDiagnostics();

      expect(readClientDiagnostics().length).toBe(0);
      expect(readClientBreadcrumbs().length).toBe(0);
      expect(readClientErrors().length).toBe(0);
    });
  });

  describe("getClientDebugSnapshot", () => {
    it("returns snapshot with environment info and sliced data", () => {
      recordClientDiagnostic("telemetry", "Test diag");
      recordClientBreadcrumb("route", "Test breadcrumb");
      recordClientError("Test err");

      const snapshot = getClientDebugSnapshot();

      expect(snapshot).toMatchObject({
        currentPath: "/test",
        currentSearch: "?q=1",
        viewportWidth: 1024,
        viewportHeight: 768,
        userAgent: "test-agent (Renderer: unknown)",
        sessionId: expect.any(String),
        subjectId: expect.any(String),
      });

      expect(snapshot.diagnostics).toHaveLength(2); // One from explicit call, one from error
      expect(snapshot.breadcrumbs).toHaveLength(2); // One from explicit call, one from error
      expect(snapshot.recentErrors).toHaveLength(1);
    });

    it("extracts renderer from WebGL context", () => {
      const mockGetExtension = vi.fn().mockReturnValue({ UNMASKED_RENDERER_WEBGL: 37446 });
      const mockGetParameter = vi.fn().mockReturnValue("Test GPU Renderer");
      const mockGetContext = vi.fn().mockReturnValue({
        getExtension: mockGetExtension,
        getParameter: mockGetParameter,
      });

      vi.stubGlobal("document", {
        ...document,
        createElement: (tagName: string) => {
          if (tagName === "canvas") {
            return { getContext: mockGetContext } as any;
          }
          return { getContext: () => null } as any;
        }
      });

      const snapshot = getClientDebugSnapshot();
      expect(snapshot.userAgent).toBe("test-agent (Renderer: Test GPU Renderer)");
    });

    it("handles WebGL context errors gracefully", () => {
      vi.stubGlobal("document", {
        ...document,
        createElement: (tagName: string) => {
          if (tagName === "canvas") {
            return {
              getContext: () => {
                throw new Error("Simulated WebGL error");
              }
            } as any;
          }
          return { getContext: () => null } as any;
        }
      });

      const snapshot = getClientDebugSnapshot();
      expect(snapshot.userAgent).toBe("test-agent (Renderer: unknown)");
    });

    it("works when window is undefined", () => {
      vi.stubGlobal("window", undefined);

      const snapshot = getClientDebugSnapshot();
      expect(snapshot).toMatchObject({
        currentPath: "/",
        currentSearch: "",
        viewportWidth: 0,
        viewportHeight: 0,
        userAgent: "",
        sessionId: "server",
        subjectId: "server",
      });
    });
  });

  describe("installClientDiagnosticsBridge", () => {
    it("installs window error listeners and interaction breadcrumbs", () => {
      installClientDiagnosticsBridge();

      expect(window.addEventListener).toHaveBeenCalledWith("error", expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));
      expect(document.addEventListener).toHaveBeenCalledWith("click", expect.any(Function), { capture: true });
      expect((window as any).__KANDYDROPS_DEBUG__).toBeDefined();
    });

    it("does not install multiple times", () => {
      installClientDiagnosticsBridge();
      const callsCount = vi.mocked(window.addEventListener).mock.calls.length;

      installClientDiagnosticsBridge();
      expect(vi.mocked(window.addEventListener).mock.calls.length).toBe(callsCount);
    });
  });
});
