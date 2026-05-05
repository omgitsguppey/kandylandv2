# Support Doctrine

Authority level: 4

Owner: support/bug reports

## Must

- Record bug reports with category, route, component, and severity.
- Record support tickets with ticketId/threadId/category.
- Keep user support actions visible in user timelines.
- Feed support permission errors into debug evidence.

## Must Not

- Count admin support replies as user behavior.
- Drop support failures silently.
- Treat flat legacy support messages as canonical if route truth exists.

## Source Truth

- Support routes, support thread model, debug evidence, support tracking facts.

## Validators

- `check:support-recovery-flows`
- `check:support-tracking-truth`
