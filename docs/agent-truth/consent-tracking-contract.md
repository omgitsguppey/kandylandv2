# Consent Tracking Contract

Status: cookie consent and privacy tracking are connected to a first-class consent mode policy. Minimal or declined choices do not allow full behavioral tracking or external analytics.

- Policy version: 2026-05-consent-tracking-v1
- Modes: unknown, necessary_only, minimal_analytics, full_analytics, full_behavioral
- Capabilities: required_security, required_session, required_account, payment_integrity, product_usage_minimal, performance_analytics, behavioral_analytics, personalization, external_analytics, debug_diagnostics
- Banner mobile compact: true
- Banner no truncation: true
- Banner tracking connected: true

## Decision Effects

- Accept all: full_behavioral, behavioral tracking enabled, external analytics enabled.
- Minimal analytics: product usage and performance analytics only; behavioral and external analytics blocked.
- Decline optional: required security/session/account/payment integrity only.

## Validation

- Pass.
