# Open Pr Dependency Hygiene

Artifact: `agent/state/open-pr-dependency-hygiene.generated.json`
Validator: `npm run check:open-pr-dependency-hygiene`

## Summary

- Generated: `2026-05-26T17:18:37.754Z`
- Current head: `5f7c45eaaa46bee98843e0c9b1a371010eaf2cb6`
- Status: `pass`

## Report

```json
{
  "reportKey": "open-pr-dependency-hygiene",
  "generatedAtUtc": "2026-05-26T17:18:37.754Z",
  "currentHead": "5f7c45eaaa46bee98843e0c9b1a371010eaf2cb6",
  "openPrs": [
    {
      "author": {
        "id": "MDQ6VXNlcjI5NjY2MDQ3",
        "is_bot": false,
        "login": "omgitsguppey",
        "name": ""
      },
      "baseRefName": "main",
      "headRefName": "sentinel-fix-open-redirect-prng-9331490272571705519",
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 304,
      "title": "🛡️ Sentinel: [HIGH] Fix open redirect and weak PRNG",
      "updatedAt": "2026-05-26T15:38:42Z",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/304",
      "classification": "security_pr_to_cherry_pick",
      "dependencyRiskClass": "security_required",
      "reason": "Security-labeled PR requires source review and a scoped cherry-pick or equivalent patch before beta exit; it is not merged blindly from an unknown branch state.",
      "nextExactAction": "Review PR #304, port the isolated security fix if it applies to current source, then run targeted security/unit checks.",
      "blocksBetaExit": true
    },
    {
      "author": {
        "id": "MDQ6VXNlcjI5NjY2MDQ3",
        "is_bot": false,
        "login": "omgitsguppey",
        "name": ""
      },
      "baseRefName": "main",
      "headRefName": "jules-bolt-library-perf-3411842256230391376",
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 303,
      "title": "⚡ Bolt: Consolidate useMemo iterations in LibraryClient",
      "updatedAt": "2026-05-26T15:32:00Z",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/303",
      "classification": "performance_pr_to_merge",
      "dependencyRiskClass": "not_dependency",
      "reason": "Small performance PR is useful, but must not supersede current source or import scratch work.",
      "nextExactAction": "Review PR #303 against current source and cherry-pick only the isolated performance change if tests stay green.",
      "blocksBetaExit": false
    },
    {
      "author": {
        "id": "MDQ6VXNlcjI5NjY2MDQ3",
        "is_bot": false,
        "login": "omgitsguppey",
        "name": ""
      },
      "baseRefName": "main",
      "headRefName": "onboarding-friction-telemetry-3629393003427856299",
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 302,
      "title": "🧭 Improve onboarding friction visibility and technical rescue signals",
      "updatedAt": "2026-05-26T05:43:19Z",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/302",
      "classification": "unsafe_pr_needs_manual_review",
      "dependencyRiskClass": "not_dependency",
      "reason": "Governance/product-scope PR overlaps release readiness and needs human ordering rather than automatic merge.",
      "nextExactAction": "Manually review PR #302; defer or close if superseded by current release-readiness and hardening artifacts.",
      "blocksBetaExit": false
    },
    {
      "author": {
        "id": "MDQ6VXNlcjI5NjY2MDQ3",
        "is_bot": false,
        "login": "omgitsguppey",
        "name": ""
      },
      "baseRefName": "main",
      "headRefName": "jules-doctrine-compliance-audit-10191427259102396052",
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 301,
      "title": "📚 Reduce doctrine drift and banned-pattern reintroduction",
      "updatedAt": "2026-05-26T05:39:57Z",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/301",
      "classification": "unsafe_pr_needs_manual_review",
      "dependencyRiskClass": "not_dependency",
      "reason": "Governance/product-scope PR overlaps release readiness and needs human ordering rather than automatic merge.",
      "nextExactAction": "Manually review PR #301; defer or close if superseded by current release-readiness and hardening artifacts.",
      "blocksBetaExit": false
    },
    {
      "author": {
        "id": "MDQ6VXNlcjI5NjY2MDQ3",
        "is_bot": false,
        "login": "omgitsguppey",
        "name": ""
      },
      "baseRefName": "main",
      "headRefName": "audit/monolith-file-risk-241787922391348535",
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 300,
      "title": "🧱 Reduce monolith file risk and clarify responsibility boundaries",
      "updatedAt": "2026-05-26T05:38:49Z",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/300",
      "classification": "unsafe_pr_needs_manual_review",
      "dependencyRiskClass": "not_dependency",
      "reason": "Governance/product-scope PR overlaps release readiness and needs human ordering rather than automatic merge.",
      "nextExactAction": "Manually review PR #300; defer or close if superseded by current release-readiness and hardening artifacts.",
      "blocksBetaExit": false
    },
    {
      "author": {
        "is_bot": true,
        "login": "app/dependabot"
      },
      "baseRefName": "main",
      "headRefName": "dependabot/npm_and_yarn/functions/functions-npm-minor-patch-4a8d933f5b",
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 299,
      "title": "chore(deps): bump the functions-npm-minor-patch group in /functions with 5 updates",
      "updatedAt": "2026-05-26T05:24:43Z",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/299",
      "classification": "dependency_pr_to_close_or_defer",
      "dependencyRiskClass": "provider_sdk_risk",
      "reason": "Dependency updates are not merged blindly during beta-exit finalization; broad/provider/tooling changes need a separate dependency window.",
      "nextExactAction": "Defer PR #299 until after beta exit unless a security advisory makes it mandatory.",
      "blocksBetaExit": false
    },
    {
      "author": {
        "is_bot": true,
        "login": "app/dependabot"
      },
      "baseRefName": "main",
      "headRefName": "dependabot/npm_and_yarn/npm-check-updates-22.2.1",
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 298,
      "title": "chore(deps): bump npm-check-updates from 19.6.6 to 22.2.1",
      "updatedAt": "2026-05-26T05:24:43Z",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/298",
      "classification": "dependency_pr_to_close_or_defer",
      "dependencyRiskClass": "test_tooling_only",
      "reason": "Dependency updates are not merged blindly during beta-exit finalization; broad/provider/tooling changes need a separate dependency window.",
      "nextExactAction": "Defer PR #298 until after beta exit unless a security advisory makes it mandatory.",
      "blocksBetaExit": false
    },
    {
      "author": {
        "is_bot": true,
        "login": "app/dependabot"
      },
      "baseRefName": "main",
      "headRefName": "dependabot/npm_and_yarn/knip-6.14.2",
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 297,
      "title": "chore(deps): bump knip from 5.88.1 to 6.14.2",
      "updatedAt": "2026-05-26T05:24:43Z",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/297",
      "classification": "dependency_pr_to_close_or_defer",
      "dependencyRiskClass": "test_tooling_only",
      "reason": "Dependency updates are not merged blindly during beta-exit finalization; broad/provider/tooling changes need a separate dependency window.",
      "nextExactAction": "Defer PR #297 until after beta exit unless a security advisory makes it mandatory.",
      "blocksBetaExit": false
    },
    {
      "author": {
        "is_bot": true,
        "login": "app/dependabot"
      },
      "baseRefName": "main",
      "headRefName": "dependabot/npm_and_yarn/syncpack-15.3.1",
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 296,
      "title": "chore(deps): bump syncpack from 14.3.0 to 15.3.1",
      "updatedAt": "2026-05-26T05:24:43Z",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/296",
      "classification": "dependency_pr_to_close_or_defer",
      "dependencyRiskClass": "test_tooling_only",
      "reason": "Dependency updates are not merged blindly during beta-exit finalization; broad/provider/tooling changes need a separate dependency window.",
      "nextExactAction": "Defer PR #296 until after beta exit unless a security advisory makes it mandatory.",
      "blocksBetaExit": false
    },
    {
      "author": {
        "is_bot": true,
        "login": "app/dependabot"
      },
      "baseRefName": "main",
      "headRefName": "dependabot/npm_and_yarn/puppeteer-25.0.4",
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 295,
      "title": "chore(deps): bump puppeteer from 24.40.0 to 25.0.4",
      "updatedAt": "2026-05-26T05:24:43Z",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/295",
      "classification": "dependency_pr_to_close_or_defer",
      "dependencyRiskClass": "test_tooling_only",
      "reason": "Dependency updates are not merged blindly during beta-exit finalization; broad/provider/tooling changes need a separate dependency window.",
      "nextExactAction": "Defer PR #295 until after beta exit unless a security advisory makes it mandatory.",
      "blocksBetaExit": false
    },
    {
      "author": {
        "is_bot": true,
        "login": "app/dependabot"
      },
      "baseRefName": "main",
      "headRefName": "dependabot/npm_and_yarn/npm-minor-patch-f5bdc37de0",
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 294,
      "title": "chore(deps): bump the npm-minor-patch group across 1 directory with 48 updates",
      "updatedAt": "2026-05-26T17:05:03Z",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/294",
      "classification": "dependency_pr_to_close_or_defer",
      "dependencyRiskClass": "major_risk",
      "reason": "Dependency updates are not merged blindly during beta-exit finalization; broad/provider/tooling changes need a separate dependency window.",
      "nextExactAction": "Defer PR #294 until after beta exit unless a security advisory makes it mandatory.",
      "blocksBetaExit": false
    },
    {
      "author": {
        "id": "MDQ6VXNlcjI5NjY2MDQ3",
        "is_bot": false,
        "login": "omgitsguppey",
        "name": ""
      },
      "baseRefName": "main",
      "headRefName": "sentinel-fix-insecure-random-id-1683402257785005924",
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 293,
      "title": "🛡️ Sentinel: [High] Fix insecure Math.random() usage for ID generation",
      "updatedAt": "2026-05-26T05:24:43Z",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/293",
      "classification": "security_pr_to_cherry_pick",
      "dependencyRiskClass": "security_required",
      "reason": "Security-labeled PR requires source review and a scoped cherry-pick or equivalent patch before beta exit; it is not merged blindly from an unknown branch state.",
      "nextExactAction": "Review PR #293, port the isolated security fix if it applies to current source, then run targeted security/unit checks.",
      "blocksBetaExit": true
    },
    {
      "author": {
        "id": "MDQ6VXNlcjI5NjY2MDQ3",
        "is_bot": false,
        "login": "omgitsguppey",
        "name": ""
      },
      "baseRefName": "main",
      "headRefName": "bolt-optimization-map-lookup-11237275132598123849",
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 292,
      "title": "⚡ Bolt: Replace array `.find()` with Map lookup in debug route",
      "updatedAt": "2026-05-26T05:24:43Z",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/292",
      "classification": "performance_pr_to_merge",
      "dependencyRiskClass": "not_dependency",
      "reason": "Small performance PR is useful, but must not supersede current source or import scratch work.",
      "nextExactAction": "Review PR #292 against current source and cherry-pick only the isolated performance change if tests stay green.",
      "blocksBetaExit": false
    },
    {
      "author": {
        "id": "MDQ6VXNlcjI5NjY2MDQ3",
        "is_bot": false,
        "login": "omgitsguppey",
        "name": ""
      },
      "baseRefName": "main",
      "headRefName": "palette-a11y-loading-states-517200335107814059",
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 291,
      "title": "🎨 Palette: Add accessible loading states to Creator Experiences Panel buttons",
      "updatedAt": "2026-05-26T05:24:43Z",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/291",
      "classification": "accessibility_pr_to_merge",
      "dependencyRiskClass": "not_dependency",
      "reason": "Small accessibility PR is useful, but still needs current-source review before landing.",
      "nextExactAction": "Review PR #291 against current source and cherry-pick only the isolated accessibility improvement if it is still relevant.",
      "blocksBetaExit": false
    }
  ],
  "openPrCount": 14,
  "unclassifiedOpenPrCount": 0,
  "dependencyPrCount": 6,
  "securityPrCount": 2,
  "blocksBetaExit": true,
  "validationFailures": []
}
```

## Evidence Boundary

This source-generated packet does not prove deployed runtime, provider, billing, production admin truth, or operator-final visual QA unless the report explicitly includes a formal artifact for that category.

## Validation

- Pass.
