import { defineConfig, devices } from '@playwright/test';

export const DEFAULT_PLAYWRIGHT_BASE_URL = 'http://localhost:3000';

export function isLoopbackHostname(hostname: string) {
  return hostname === 'localhost'
    || hostname === 'localhost.'
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.localhost.')
    || hostname === '127.0.0.1'
    || hostname === '::1'
    || hostname.startsWith('127.');
}

export function resolvePlaywrightBaseUrl(rawBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_PLAYWRIGHT_BASE_URL) {
  const candidate = rawBaseUrl.trim();
  let parsed: URL;

  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(`Invalid PLAYWRIGHT_BASE_URL: ${candidate}`);
  }

  if (parsed.protocol === 'https:') {
    return candidate;
  }

  if (parsed.protocol === 'http:' && isLoopbackHostname(parsed.hostname)) {
    return candidate;
  }

  throw new Error('PLAYWRIGHT_BASE_URL must use HTTPS unless it targets a local loopback origin.');
}

type PlaywrightConfigEnv = Record<string, string | undefined>;

export function buildPlaywrightConfig(env: PlaywrightConfigEnv = process.env) {
  const baseURL = resolvePlaywrightBaseUrl(env.PLAYWRIGHT_BASE_URL);

  return defineConfig({
    timeout: 60 * 1000,
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!env.CI,
    retries: env.CI ? 2 : 0,
    workers: env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
      baseURL,
      trace: 'on-first-retry',
    },

    // Loopback HTTP is allowed for local test servers; remote targets must use HTTPS.
    webServer: env.PLAYWRIGHT_BASE_URL ? undefined : {
      command: 'npm run dev',
      url: baseURL,
      reuseExistingServer: !env.CI,
      timeout: 120 * 1000,
    },

    projects: [
      {
        name: 'chromium',
        use: { ...devices['Desktop Chrome'] },
      },
      {
        name: 'Mobile Chrome',
        use: { ...devices['Pixel 5'] },
      },
      {
        name: 'webkit',
        use: { ...devices['Desktop Safari'] },
      },
      {
        name: 'Mobile Safari',
        use: { ...devices['iPhone 14 Pro'] },
      },
      {
        name: 'Tablet Safari',
        use: { ...devices['iPad Pro 11'] },
      },
    ],
  });
}

export default buildPlaywrightConfig();
