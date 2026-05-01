# Admin Moderation Security Alerts

Admin Moderation security alerts are operator triage signals, not proof by themselves. The visible panel must be short and actionable, while raw security log details remain available through the security event record and route diagnostics.

## Source Doctrine

- Canonical source: `security_events` records written by authenticated server routes.
- Realtime source: Firestore client listener for fast updates.
- Fallback source: guarded admin API snapshots from `/api/admin/moderation/*`.
- The panel must render guarded API snapshot data when realtime is delayed or denied, then upgrade from realtime when the listener works.
- Never mark the panel `Live` while the initial feed is still loading.

## Alert Accuracy

- Every alert row must carry severity, confidence, source, context, and next action.
- Severity answers impact: `high`, `medium`, or `low`.
- Confidence answers certainty: `confirmed`, `heuristic`, or `unknown`.
- Unknown reasons must not be promoted into confirmed detections.
- Browser screenshot and screen-recording shortcuts are heuristic. The browser can catch the shortcut, but it cannot prove the operating system saved a capture.
- Confirmed blocked actions such as print, save, drag export, copy, and context-menu attempts can be shown as confirmed when they are produced by the protected viewer route.
- Repeated events should be grouped only when they are the same user, reason, object, route, and short time bucket. Do not merge a whole day of distinct attempts into one row.

## Visible Copy

Use plain operator language:

- `Review now`
- `Needs review`
- `Confirmed`
- `Source unknown`
- `Review repeated signals before taking action.`
- `Check the raw log before acting.`

Avoid implying certainty when the signal is heuristic. Avoid raw backend path fragments or collection names in visible rows.

## Research Basis

- OWASP Logging Cheat Sheet: security logs should include when, where, who, what, severity, analytical confidence, and source context, and data from different trust zones must be treated with confidence labels.
- OWASP Developer Guide logging guidance: security events need timestamp, severity, identity, outcome, and description; log access must be restricted.
- NIST SP 800-61 Rev. 3: incident triage should be based on risk factors and known false positives, not arrival order.

Sources:

- https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- https://devguide.owasp.org/en/04-design/02-web-app-checklist/09-logging-monitoring/
- https://csrc.nist.gov/pubs/sp/800/61/r3/final

## Future-Agent Rule

Future agents must not reintroduce pure realtime-only moderation loading, day-wide alert clustering, or confirmed wording for heuristic screenshot and recording signals.
