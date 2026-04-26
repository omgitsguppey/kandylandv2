# Dependency Audit Workflow

This workflow guides the agent and developers through auditing dependencies, ensuring their runtime truth, and safely updating them across the KandyDrops monolith.

## Context
KandyDrops uses critical Google Cloud and Firebase dependencies that must be kept in sync with the live environment. Outdated versions can cause security vulnerabilities or API compatibility issues. However, updates must be audited to ensure they do not introduce breaking changes or conflicts.

## Workflow

1. **Check for Outdated Packages**
   - Run `npm run check:outdated` or `npx npm-check-updates` to see what is old.
   - Do not blindly apply all major updates.

2. **Verify Critical Truth**
   - Run `npm run check:dependency-truth`
   - This script checks if the installed versions of critical packages (e.g., `firebase`, `firebase-admin`, `@google-cloud/vertexai`) match their expected constraints in `package.json` and are actually present in `node_modules`.

3. **Safe Updating**
   - Use `npm install <package>@latest` for targeted updates.
   - Always run `npm run check:consistency` after updating dependencies to catch type errors, test failures, or lint issues.

4. **Update the Telemetry / Admin Panel**
   - When introducing a new critical SDK (e.g., a new GCP service package), modify `src/app/api/admin/debug/route.ts` to include its version in the `dependencyHealth` payload.
   - This ensures the Admin Debug panel's "Infrastructure & Dependencies" section stays truthful.

5. **Commit and Push**
   - Document any major version upgrades in the commit message.
   - Verify pipeline tests pass before merging.
