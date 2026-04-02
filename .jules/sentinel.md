## 2024-05-24 - [Insecure Randomness for Security Tokens/IDs]
**Vulnerability:** Weak random number generation using `Math.random()` as a fallback for generating identifiers, tokens, and session IDs.
**Learning:** `Math.random()` is not cryptographically secure and can be predicted, leading to session hijacking or predictable ID vulnerabilities.
**Prevention:** Remove `Math.random()` fallbacks. If `crypto.randomUUID()` or `crypto.getRandomValues()` are not available, throw an error to fail securely.

## 2026-04-02 - [Cron Routes Bypassing Sanitized Error Handling]
**Vulnerability:** Some cron endpoints returned raw `error.message` values directly in 500 responses instead of going through the shared server error sanitizer.
**Learning:** This codebase already has a safe default in `handleApiError`, but isolated route handlers can drift away from it and reintroduce information exposure on failure paths.
**Prevention:** Route-level catch blocks for privileged jobs should delegate to `handleApiError` unless they are returning an intentionally curated client-safe error.
