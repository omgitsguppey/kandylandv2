## 2024-05-24 - [Insecure Randomness for Security Tokens/IDs]
**Vulnerability:** Weak random number generation using `Math.random()` as a fallback for generating identifiers, tokens, and session IDs.
**Learning:** `Math.random()` is not cryptographically secure and can be predicted, leading to session hijacking or predictable ID vulnerabilities.
**Prevention:** Remove `Math.random()` fallbacks. If `crypto.randomUUID()` or `crypto.getRandomValues()` are not available, throw an error to fail securely.

## 2026-04-02 - [Cron Routes Bypassing Sanitized Error Handling]
**Vulnerability:** Some cron endpoints returned raw `error.message` values directly in 500 responses instead of going through the shared server error sanitizer.
**Learning:** This codebase already has a safe default in `handleApiError`, but isolated route handlers can drift away from it and reintroduce information exposure on failure paths.
**Prevention:** Route-level catch blocks for privileged jobs should delegate to `handleApiError` unless they are returning an intentionally curated client-safe error.

## 2024-05-25 - [dangerouslySetInnerHTML Static Injection Risk]
**Vulnerability:** Injecting static `<style>` definitions using React's `dangerouslySetInnerHTML`.
**Learning:** While static CSS is not an immediate XSS vulnerability, using dynamic injection primitives for static content violates strict CSP restrictions and establishes an insecure pattern that could be easily adapted by other developers for dynamic user data, introducing XSS.
**Prevention:** Always migrate static keyframes, complex selectors, or raw styles into the application's global CSS or Tailwind configuration, and control dynamic behavior using React inline `style` tags coupled with CSS Variables (e.g., `['--var']: value`).

## 2026-04-10 - [Missing CSRF Protection on Mutating API Endpoints]
**Vulnerability:** The PUT endpoint in `api/admin/ui-chart-health/route.ts` was missing the `requireTrustedOrigin: true` parameter in its `guardApiRequest` call.
**Learning:** Without explicit trusted origin validation, state-mutating endpoints (POST, PUT, DELETE) are vulnerable to Cross-Site Request Forgery (CSRF) if the API relies on cookies or other ambient authority that browsers automatically attach.
**Prevention:** Always include `requireTrustedOrigin: true` in the `guardApiRequest` configuration object for any Next.js route handler that performs state mutations (POST, PUT, DELETE), regardless of other authentication checks.
