# Security Policy

## Supported Branch

Security fixes are accepted for `main`. Release branches must document explicit support windows before they are treated as supported.

## Reporting Vulnerabilities

Do not open public issues for secrets, vulnerabilities, payment bugs, unlock/content-protection bypasses, account access bugs, data exposure, or infrastructure security concerns.

Report privately to:

- Emergency contact: `security-contact-placeholder@kandydrops.example`
- Backup owner: `@omgitsguppey`

Include a concise description, affected surface, reproduction steps, impact, screenshots or logs with secrets removed, and whether any user/payment/content data may be exposed.

## Response Window

- Acknowledgement target: 2 business days.
- Initial triage target: 5 business days.
- Critical payment, auth, entitlement, secret, or private-content exposure: start containment immediately after triage.

## Secrets Policy

- Production secrets must live only in approved secret managers or GitHub Actions secrets.
- Never commit `.env`, service account keys, private keys, tokens, webhook secrets, PayPal secrets, Firebase admin credentials, BigQuery credentials, or AI provider keys.
- Keep `.env.example` to variable names and safe comments only.
- If a secret is committed or pasted publicly, treat it as compromised, revoke it, rotate it, and open a private incident.

## Emergency Handling

Use `docs/runbooks/incident-response.md` first, then the specialized runbook for payments, Firestore rules, or analytics truth if applicable.
