# Admin Heartbeat Contract

- Default cadence: 3600 seconds.
- Page loads read heartbeat evidence only; they do not write heartbeat records.
- Missing heartbeat evidence is reported as missing, not healthy.
- Records include duration, source counts, cost estimate, and nextDueAtUtc.
