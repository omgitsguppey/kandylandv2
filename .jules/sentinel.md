## 2025-02-14 - Fix missing CSRF on analytics endpoints
**Vulnerability:** Missing Cross-Site Request Forgery (CSRF) protection on `POST` endpoints (`/api/analytics/ingest`, `/api/telemetry/track`, and `/api/viewer/watch-session`).
**Learning:** In Next.js route handlers using the custom `guardApiRequest` utility, `POST`, `PUT`, and `DELETE` requests must explicitly be passed `requireTrustedOrigin: true` to enable origin-based CSRF checks. Failing to do so on telemetry or analytics endpoints allows external sites to forge requests and pollute the application's data.
**Prevention:** Always verify that state-mutating API routes configured via `guardApiRequest` explicitly enable `requireTrustedOrigin`.
