# Admin Overview Hot Cache

- Page load reads one admin overview snapshot doc and one heartbeat doc.
- Missing snapshot returns source-missing state and does not run broad fallback reads.
- Admin auth guard remains request-time dynamic.
