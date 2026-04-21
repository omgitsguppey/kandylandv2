---
applyTo: "tests/**/*.ts,tests/**/*.tsx"
---

# Test Instructions

- Prefer the narrowest valid test lane first.
- Use `npm run agent:test -- <path>` or a bounded `npx vitest run ...` command before any full-suite sweep.
- Avoid refactoring product code just to satisfy tests unless the production code is the real defect.
- If a new helper or route is introduced, add or repair tests in the same pass.
- If a broader repo lane remains unverified, state it explicitly instead of implying full signoff.
