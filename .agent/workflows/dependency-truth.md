# Dependency Truth Workflow

> [!IMPORTANT]
> **Purpose**: This workflow describes how to verify the structural integrity of the project's dependencies and infrastructure bindings to ensure absolute stability and truthfulness.

## The Check

Run the truthful checker:
```bash
npx tsx scripts/agent/check-infrastructure-truth.ts
```

This script will verify that critical Firebase, GCP, and React/Next dependencies are present in `package.json`. If a required dependency is missing, the script will exit with an error (`1`), causing pipeline or CI tasks to fail.

## Remediation

If `check-infrastructure-truth.ts` fails:
1. Review the missing dependency error.
2. Run `npm install <package> --save` or `npm install <package> --save-dev`.
3. Do NOT downgrade major versions of Firebase or React without explicit admin review.
4. Run the script again to verify compliance.

## Integration

The check should be run locally by agents prior to suggesting dependency changes, and will be incorporated into the broader `npm run check:continuity` lane.
