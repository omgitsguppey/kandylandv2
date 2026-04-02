import { describe, expect, it } from 'vitest';
import {
  buildPlaywrightConfig,
  DEFAULT_PLAYWRIGHT_BASE_URL,
  isLoopbackHostname,
  resolvePlaywrightBaseUrl,
} from '../../playwright.config';

describe('playwright config security', () => {
  it('treats localhost and loopback addresses as local origins', () => {
    expect(isLoopbackHostname('localhost')).toBe(true);
    expect(isLoopbackHostname('preview.localhost')).toBe(true);
    expect(isLoopbackHostname('127.0.0.1')).toBe(true);
    expect(isLoopbackHostname('127.10.1.4')).toBe(true);
    expect(isLoopbackHostname('::1')).toBe(true);
    expect(isLoopbackHostname('example.com')).toBe(false);
  });

  it('keeps the default local Playwright base URL', () => {
    expect(resolvePlaywrightBaseUrl()).toBe(DEFAULT_PLAYWRIGHT_BASE_URL);
  });

  it('allows HTTPS for non-local targets', () => {
    expect(resolvePlaywrightBaseUrl('https://staging.kandydrops.example')).toBe('https://staging.kandydrops.example');
  });

  it('allows HTTP only for loopback targets', () => {
    expect(resolvePlaywrightBaseUrl('http://127.0.0.1:4173')).toBe('http://127.0.0.1:4173');
    expect(() => resolvePlaywrightBaseUrl('http://staging.kandydrops.example')).toThrow(
      'PLAYWRIGHT_BASE_URL must use HTTPS unless it targets a local loopback origin.',
    );
  });

  it('rejects invalid base URLs', () => {
    expect(() => resolvePlaywrightBaseUrl('not a url')).toThrow('Invalid PLAYWRIGHT_BASE_URL: not a url');
  });

  it('skips launching the managed local web server for explicit external targets', () => {
    const config = buildPlaywrightConfig({ PLAYWRIGHT_BASE_URL: 'https://staging.kandydrops.example' });
    expect(config.use?.baseURL).toBe('https://staging.kandydrops.example');
    expect(config.webServer).toBeUndefined();
  });

  it('keeps the managed local web server for the default local setup', () => {
    const config = buildPlaywrightConfig({});
    expect(config.use?.baseURL).toBe(DEFAULT_PLAYWRIGHT_BASE_URL);
    expect(config.webServer).toMatchObject({
      command: 'npm run dev',
      url: DEFAULT_PLAYWRIGHT_BASE_URL,
    });
  });
});
