# Final Open PR Closure

Generated: 2026-06-01T18:24:43.667Z
Current HEAD: d2f8ab1063d6f2b11387b38ca07603a59b77a12e
Validation failures: 0

```json
{
  "reportKey": "final-open-pr-closure",
  "generatedAtUtc": "2026-06-01T18:24:43.667Z",
  "currentHead": "d2f8ab1063d6f2b11387b38ca07603a59b77a12e",
  "openPrsBefore": [
    {
      "number": 319,
      "title": "Sentinel HIGH: Fix open redirect via protocol-relative URLs",
      "status": "security_patch_equivalent_landed",
      "dependencyRiskClass": "security_required",
      "securityRequired": true,
      "reason": "Ported the current-source equivalent drop action URL protocol-relative and backslash redirect guards for admin and server drop publish paths.",
      "nextWindow": "current_beta_exit_closure"
    },
    {
      "number": 311,
      "title": "Sentinel MEDIUM: Fix insecure error logging exposing stack traces in API routes",
      "status": "security_patch_equivalent_landed",
      "dependencyRiskClass": "security_required",
      "securityRequired": true,
      "reason": "Replaced insecure API route console logging with structured recordRouteWarning diagnostics without disabling useful telemetry.",
      "nextWindow": "current_beta_exit_closure"
    },
    {
      "number": 306,
      "title": "Sentinel MEDIUM: Replace console.warn with secure recordRouteWarning in creator settings API",
      "status": "security_patch_equivalent_landed",
      "dependencyRiskClass": "security_required",
      "securityRequired": true,
      "reason": "Covered by the current-source creator settings route diagnostic logging replacement.",
      "nextWindow": "current_beta_exit_closure"
    },
    {
      "number": 304,
      "title": "Sentinel HIGH: Fix open redirect and weak PRNG",
      "status": "security_patch_equivalent_landed",
      "dependencyRiskClass": "security_required",
      "securityRequired": true,
      "reason": "Ported the current-source equivalent PromoCard redirect-smuggling guard and sensitive PRNG closure without scratch files.",
      "nextWindow": "current_beta_exit_closure"
    },
    {
      "number": 293,
      "title": "Sentinel High: Fix insecure Math.random ID generation",
      "status": "security_patch_equivalent_landed",
      "dependencyRiskClass": "security_required",
      "securityRequired": true,
      "reason": "Replaced sensitive Math.random fallbacks with the existing crypto-backed client random helper.",
      "nextWindow": "current_beta_exit_closure"
    },
    {
      "number": 303,
      "title": "Bolt: Consolidate useMemo iterations in LibraryClient",
      "status": "performance_patch_equivalent_landed",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Ported only the single-pass LibraryClient filtering optimization; left scratch notes out.",
      "nextWindow": "current_beta_exit_closure"
    },
    {
      "number": 292,
      "title": "Bolt: Replace array .find() with Map lookup in debug route",
      "status": "performance_patch_equivalent_landed",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Ported only the task inventory Map lookup and preserved debug source truth.",
      "nextWindow": "current_beta_exit_closure"
    },
    {
      "number": 291,
      "title": "Palette: Add accessible loading states to Creator Experiences Panel buttons",
      "status": "accessibility_patch_equivalent_landed",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Ported only aria-busy and decorative loading icon aria-hidden attributes.",
      "nextWindow": "current_beta_exit_closure"
    },
    {
      "number": 294,
      "title": "Dependabot PR #294",
      "status": "dependency_deferred_post_beta",
      "dependencyRiskClass": "major_risk",
      "securityRequired": false,
      "reason": "Broad dependency changes are deferred until a post-beta dependency window unless a security advisory requires them.",
      "nextWindow": "post_beta_dependency_window"
    },
    {
      "number": 295,
      "title": "Dependabot PR #295",
      "status": "dependency_deferred_post_beta",
      "dependencyRiskClass": "test_tooling_or_minor_risk",
      "securityRequired": false,
      "reason": "Broad dependency changes are deferred until a post-beta dependency window unless a security advisory requires them.",
      "nextWindow": "post_beta_dependency_window"
    },
    {
      "number": 296,
      "title": "Dependabot PR #296",
      "status": "dependency_deferred_post_beta",
      "dependencyRiskClass": "test_tooling_or_minor_risk",
      "securityRequired": false,
      "reason": "Broad dependency changes are deferred until a post-beta dependency window unless a security advisory requires them.",
      "nextWindow": "post_beta_dependency_window"
    },
    {
      "number": 297,
      "title": "Dependabot PR #297",
      "status": "dependency_deferred_post_beta",
      "dependencyRiskClass": "test_tooling_or_minor_risk",
      "securityRequired": false,
      "reason": "Broad dependency changes are deferred until a post-beta dependency window unless a security advisory requires them.",
      "nextWindow": "post_beta_dependency_window"
    },
    {
      "number": 298,
      "title": "Dependabot PR #298",
      "status": "dependency_deferred_post_beta",
      "dependencyRiskClass": "test_tooling_or_minor_risk",
      "securityRequired": false,
      "reason": "Broad dependency changes are deferred until a post-beta dependency window unless a security advisory requires them.",
      "nextWindow": "post_beta_dependency_window"
    },
    {
      "number": 299,
      "title": "Dependabot PR #299",
      "status": "dependency_deferred_post_beta",
      "dependencyRiskClass": "provider_sdk_risk",
      "securityRequired": false,
      "reason": "Broad dependency changes are deferred until a post-beta dependency window unless a security advisory requires them.",
      "nextWindow": "post_beta_dependency_window"
    },
    {
      "number": 318,
      "title": "Palette: Add aria-busy to AuthModal buttons",
      "status": "accessibility_deferred_post_beta",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Accessibility cleanup is useful but not a current security or beta-exit blocker; defer to a focused post-beta accessibility pass.",
      "nextWindow": "post_beta_accessibility_window"
    },
    {
      "number": 317,
      "title": "Reduce duplicate computation in high-ROI aggregation hotspot",
      "status": "performance_deferred_post_beta",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Performance optimization is not security-required and needs a separate focused perf verification window.",
      "nextWindow": "post_beta_performance_window"
    },
    {
      "number": 316,
      "title": "Audit package metadata and source-of-funds truth",
      "status": "protected_payment_manual_review",
      "dependencyRiskClass": "protected_payment_required",
      "securityRequired": false,
      "reason": "Package metadata and source-of-funds truth overlap protected GumDrop/payment lanes and require manual protected-lane review before applying.",
      "nextWindow": "protected_payment_review"
    },
    {
      "number": 315,
      "title": "Bolt: Replace array .find() with Map lookup in admin rollout payload generation",
      "status": "performance_deferred_post_beta",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Admin performance cleanup is non-security and should be handled in a separate post-beta performance window.",
      "nextWindow": "post_beta_performance_window"
    },
    {
      "number": 314,
      "title": "Clean canonical event drift at source",
      "status": "telemetry_deferred_post_beta",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Telemetry source cleanup is not a current open security blocker and needs its own telemetry truth pass.",
      "nextWindow": "post_beta_telemetry_window"
    },
    {
      "number": 313,
      "title": "Palette: Add ARIA labels to Admin Drop actions",
      "status": "accessibility_deferred_post_beta",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Admin accessibility cleanup is useful but not security-required; defer to the focused accessibility window.",
      "nextWindow": "post_beta_accessibility_window"
    },
    {
      "number": 312,
      "title": "Harden realtime truth for user-facing runtime surfaces",
      "status": "broad_runtime_deferred_post_beta",
      "dependencyRiskClass": "broad_runtime_risk",
      "securityRequired": false,
      "reason": "Broad 28-file runtime hardening must not be merged blindly into the beta-exit stack.",
      "nextWindow": "post_beta_governance_window"
    },
    {
      "number": 309,
      "title": "Improve accessibility of loading states in creator components",
      "status": "accessibility_deferred_post_beta",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Creator loading accessibility cleanup is not security-required and should stay in a focused accessibility pass.",
      "nextWindow": "post_beta_accessibility_window"
    },
    {
      "number": 308,
      "title": "Audit package metadata and source-of-funds truth",
      "status": "protected_payment_manual_review",
      "dependencyRiskClass": "protected_payment_required",
      "securityRequired": false,
      "reason": "Source-of-funds work is explicitly protected and requires manual review outside this lane.",
      "nextWindow": "protected_payment_review"
    },
    {
      "number": 307,
      "title": "Reduce monolith file risk and clarify responsibility boundaries",
      "status": "governance_deferred_post_beta",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Governance documentation and monolith boundary cleanup are deferred until after beta-exit source closure.",
      "nextWindow": "post_beta_governance_window"
    },
    {
      "number": 305,
      "title": "Palette: Add aria-busy to async buttons",
      "status": "accessibility_deferred_post_beta",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Generic async-button accessibility cleanup is useful but not a current security or beta-exit blocker.",
      "nextWindow": "post_beta_accessibility_window"
    },
    {
      "number": 300,
      "title": "Governance/product PR #300",
      "status": "governance_deferred_post_beta",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Governance/product-scope work is deferred until after beta-exit source closure to avoid broad overlap.",
      "nextWindow": "post_beta_governance_window"
    },
    {
      "number": 301,
      "title": "Governance/product PR #301",
      "status": "governance_deferred_post_beta",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Governance/product-scope work is deferred until after beta-exit source closure to avoid broad overlap.",
      "nextWindow": "post_beta_governance_window"
    },
    {
      "number": 302,
      "title": "Governance/product PR #302",
      "status": "governance_deferred_post_beta",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Governance/product-scope work is deferred until after beta-exit source closure to avoid broad overlap.",
      "nextWindow": "post_beta_governance_window"
    }
  ],
  "handledPrs": [
    {
      "number": 319,
      "title": "Sentinel HIGH: Fix open redirect via protocol-relative URLs",
      "status": "security_patch_equivalent_landed",
      "dependencyRiskClass": "security_required",
      "securityRequired": true,
      "reason": "Ported the current-source equivalent drop action URL protocol-relative and backslash redirect guards for admin and server drop publish paths.",
      "nextWindow": "current_beta_exit_closure"
    },
    {
      "number": 311,
      "title": "Sentinel MEDIUM: Fix insecure error logging exposing stack traces in API routes",
      "status": "security_patch_equivalent_landed",
      "dependencyRiskClass": "security_required",
      "securityRequired": true,
      "reason": "Replaced insecure API route console logging with structured recordRouteWarning diagnostics without disabling useful telemetry.",
      "nextWindow": "current_beta_exit_closure"
    },
    {
      "number": 306,
      "title": "Sentinel MEDIUM: Replace console.warn with secure recordRouteWarning in creator settings API",
      "status": "security_patch_equivalent_landed",
      "dependencyRiskClass": "security_required",
      "securityRequired": true,
      "reason": "Covered by the current-source creator settings route diagnostic logging replacement.",
      "nextWindow": "current_beta_exit_closure"
    },
    {
      "number": 304,
      "title": "Sentinel HIGH: Fix open redirect and weak PRNG",
      "status": "security_patch_equivalent_landed",
      "dependencyRiskClass": "security_required",
      "securityRequired": true,
      "reason": "Ported the current-source equivalent PromoCard redirect-smuggling guard and sensitive PRNG closure without scratch files.",
      "nextWindow": "current_beta_exit_closure"
    },
    {
      "number": 293,
      "title": "Sentinel High: Fix insecure Math.random ID generation",
      "status": "security_patch_equivalent_landed",
      "dependencyRiskClass": "security_required",
      "securityRequired": true,
      "reason": "Replaced sensitive Math.random fallbacks with the existing crypto-backed client random helper.",
      "nextWindow": "current_beta_exit_closure"
    },
    {
      "number": 303,
      "title": "Bolt: Consolidate useMemo iterations in LibraryClient",
      "status": "performance_patch_equivalent_landed",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Ported only the single-pass LibraryClient filtering optimization; left scratch notes out.",
      "nextWindow": "current_beta_exit_closure"
    },
    {
      "number": 292,
      "title": "Bolt: Replace array .find() with Map lookup in debug route",
      "status": "performance_patch_equivalent_landed",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Ported only the task inventory Map lookup and preserved debug source truth.",
      "nextWindow": "current_beta_exit_closure"
    },
    {
      "number": 291,
      "title": "Palette: Add accessible loading states to Creator Experiences Panel buttons",
      "status": "accessibility_patch_equivalent_landed",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Ported only aria-busy and decorative loading icon aria-hidden attributes.",
      "nextWindow": "current_beta_exit_closure"
    },
    {
      "number": 294,
      "title": "Dependabot PR #294",
      "status": "dependency_deferred_post_beta",
      "dependencyRiskClass": "major_risk",
      "securityRequired": false,
      "reason": "Broad dependency changes are deferred until a post-beta dependency window unless a security advisory requires them.",
      "nextWindow": "post_beta_dependency_window"
    },
    {
      "number": 295,
      "title": "Dependabot PR #295",
      "status": "dependency_deferred_post_beta",
      "dependencyRiskClass": "test_tooling_or_minor_risk",
      "securityRequired": false,
      "reason": "Broad dependency changes are deferred until a post-beta dependency window unless a security advisory requires them.",
      "nextWindow": "post_beta_dependency_window"
    },
    {
      "number": 296,
      "title": "Dependabot PR #296",
      "status": "dependency_deferred_post_beta",
      "dependencyRiskClass": "test_tooling_or_minor_risk",
      "securityRequired": false,
      "reason": "Broad dependency changes are deferred until a post-beta dependency window unless a security advisory requires them.",
      "nextWindow": "post_beta_dependency_window"
    },
    {
      "number": 297,
      "title": "Dependabot PR #297",
      "status": "dependency_deferred_post_beta",
      "dependencyRiskClass": "test_tooling_or_minor_risk",
      "securityRequired": false,
      "reason": "Broad dependency changes are deferred until a post-beta dependency window unless a security advisory requires them.",
      "nextWindow": "post_beta_dependency_window"
    },
    {
      "number": 298,
      "title": "Dependabot PR #298",
      "status": "dependency_deferred_post_beta",
      "dependencyRiskClass": "test_tooling_or_minor_risk",
      "securityRequired": false,
      "reason": "Broad dependency changes are deferred until a post-beta dependency window unless a security advisory requires them.",
      "nextWindow": "post_beta_dependency_window"
    },
    {
      "number": 299,
      "title": "Dependabot PR #299",
      "status": "dependency_deferred_post_beta",
      "dependencyRiskClass": "provider_sdk_risk",
      "securityRequired": false,
      "reason": "Broad dependency changes are deferred until a post-beta dependency window unless a security advisory requires them.",
      "nextWindow": "post_beta_dependency_window"
    },
    {
      "number": 318,
      "title": "Palette: Add aria-busy to AuthModal buttons",
      "status": "accessibility_deferred_post_beta",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Accessibility cleanup is useful but not a current security or beta-exit blocker; defer to a focused post-beta accessibility pass.",
      "nextWindow": "post_beta_accessibility_window"
    },
    {
      "number": 317,
      "title": "Reduce duplicate computation in high-ROI aggregation hotspot",
      "status": "performance_deferred_post_beta",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Performance optimization is not security-required and needs a separate focused perf verification window.",
      "nextWindow": "post_beta_performance_window"
    },
    {
      "number": 316,
      "title": "Audit package metadata and source-of-funds truth",
      "status": "protected_payment_manual_review",
      "dependencyRiskClass": "protected_payment_required",
      "securityRequired": false,
      "reason": "Package metadata and source-of-funds truth overlap protected GumDrop/payment lanes and require manual protected-lane review before applying.",
      "nextWindow": "protected_payment_review"
    },
    {
      "number": 315,
      "title": "Bolt: Replace array .find() with Map lookup in admin rollout payload generation",
      "status": "performance_deferred_post_beta",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Admin performance cleanup is non-security and should be handled in a separate post-beta performance window.",
      "nextWindow": "post_beta_performance_window"
    },
    {
      "number": 314,
      "title": "Clean canonical event drift at source",
      "status": "telemetry_deferred_post_beta",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Telemetry source cleanup is not a current open security blocker and needs its own telemetry truth pass.",
      "nextWindow": "post_beta_telemetry_window"
    },
    {
      "number": 313,
      "title": "Palette: Add ARIA labels to Admin Drop actions",
      "status": "accessibility_deferred_post_beta",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Admin accessibility cleanup is useful but not security-required; defer to the focused accessibility window.",
      "nextWindow": "post_beta_accessibility_window"
    },
    {
      "number": 312,
      "title": "Harden realtime truth for user-facing runtime surfaces",
      "status": "broad_runtime_deferred_post_beta",
      "dependencyRiskClass": "broad_runtime_risk",
      "securityRequired": false,
      "reason": "Broad 28-file runtime hardening must not be merged blindly into the beta-exit stack.",
      "nextWindow": "post_beta_governance_window"
    },
    {
      "number": 309,
      "title": "Improve accessibility of loading states in creator components",
      "status": "accessibility_deferred_post_beta",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Creator loading accessibility cleanup is not security-required and should stay in a focused accessibility pass.",
      "nextWindow": "post_beta_accessibility_window"
    },
    {
      "number": 308,
      "title": "Audit package metadata and source-of-funds truth",
      "status": "protected_payment_manual_review",
      "dependencyRiskClass": "protected_payment_required",
      "securityRequired": false,
      "reason": "Source-of-funds work is explicitly protected and requires manual review outside this lane.",
      "nextWindow": "protected_payment_review"
    },
    {
      "number": 307,
      "title": "Reduce monolith file risk and clarify responsibility boundaries",
      "status": "governance_deferred_post_beta",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Governance documentation and monolith boundary cleanup are deferred until after beta-exit source closure.",
      "nextWindow": "post_beta_governance_window"
    },
    {
      "number": 305,
      "title": "Palette: Add aria-busy to async buttons",
      "status": "accessibility_deferred_post_beta",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Generic async-button accessibility cleanup is useful but not a current security or beta-exit blocker.",
      "nextWindow": "post_beta_accessibility_window"
    },
    {
      "number": 300,
      "title": "Governance/product PR #300",
      "status": "governance_deferred_post_beta",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Governance/product-scope work is deferred until after beta-exit source closure to avoid broad overlap.",
      "nextWindow": "post_beta_governance_window"
    },
    {
      "number": 301,
      "title": "Governance/product PR #301",
      "status": "governance_deferred_post_beta",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Governance/product-scope work is deferred until after beta-exit source closure to avoid broad overlap.",
      "nextWindow": "post_beta_governance_window"
    },
    {
      "number": 302,
      "title": "Governance/product PR #302",
      "status": "governance_deferred_post_beta",
      "dependencyRiskClass": "not_dependency",
      "securityRequired": false,
      "reason": "Governance/product-scope work is deferred until after beta-exit source closure to avoid broad overlap.",
      "nextWindow": "post_beta_governance_window"
    }
  ],
  "securityPrsResolved": true,
  "performancePrsResolved": true,
  "accessibilityPrsResolved": true,
  "dependencyPrsDeferred": [
    {
      "number": 294,
      "title": "Dependabot PR #294",
      "status": "dependency_deferred_post_beta",
      "dependencyRiskClass": "major_risk",
      "securityRequired": false,
      "reason": "Broad dependency changes are deferred until a post-beta dependency window unless a security advisory requires them.",
      "nextWindow": "post_beta_dependency_window"
    },
    {
      "number": 295,
      "title": "Dependabot PR #295",
      "status": "dependency_deferred_post_beta",
      "dependencyRiskClass": "test_tooling_or_minor_risk",
      "securityRequired": false,
      "reason": "Broad dependency changes are deferred until a post-beta dependency window unless a security advisory requires them.",
      "nextWindow": "post_beta_dependency_window"
    },
    {
      "number": 296,
      "title": "Dependabot PR #296",
      "status": "dependency_deferred_post_beta",
      "dependencyRiskClass": "test_tooling_or_minor_risk",
      "securityRequired": false,
      "reason": "Broad dependency changes are deferred until a post-beta dependency window unless a security advisory requires them.",
      "nextWindow": "post_beta_dependency_window"
    },
    {
      "number": 297,
      "title": "Dependabot PR #297",
      "status": "dependency_deferred_post_beta",
      "dependencyRiskClass": "test_tooling_or_minor_risk",
      "securityRequired": false,
      "reason": "Broad dependency changes are deferred until a post-beta dependency window unless a security advisory requires them.",
      "nextWindow": "post_beta_dependency_window"
    },
    {
      "number": 298,
      "title": "Dependabot PR #298",
      "status": "dependency_deferred_post_beta",
      "dependencyRiskClass": "test_tooling_or_minor_risk",
      "securityRequired": false,
      "reason": "Broad dependency changes are deferred until a post-beta dependency window unless a security advisory requires them.",
      "nextWindow": "post_beta_dependency_window"
    },
    {
      "number": 299,
      "title": "Dependabot PR #299",
      "status": "dependency_deferred_post_beta",
      "dependencyRiskClass": "provider_sdk_risk",
      "securityRequired": false,
      "reason": "Broad dependency changes are deferred until a post-beta dependency window unless a security advisory requires them.",
      "nextWindow": "post_beta_dependency_window"
    }
  ],
  "openPrsAfter": [
    {
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 319,
      "title": "🛡️ Sentinel: [High] Fix Open Redirect via Protocol-Relative URLs",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/319"
    },
    {
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 318,
      "title": "🎨 Palette: Add aria-busy to AuthModal buttons",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/318"
    },
    {
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 317,
      "title": "⚙️ Reduce duplicate computation in high-ROI aggregation hotspot",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/317"
    },
    {
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 316,
      "title": "💸 Audit package metadata and source-of-funds truth",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/316"
    },
    {
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 315,
      "title": "⚡ Bolt: Replace array .find() with Map lookup in admin rollout payload generation",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/315"
    },
    {
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 314,
      "title": "🧾 Clean canonical event drift at source",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/314"
    },
    {
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 313,
      "title": "🎨 Palette: Add ARIA labels to Admin Drop actions",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/313"
    },
    {
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 312,
      "title": "⚡ Harden realtime truth for user-facing runtime surfaces",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/312"
    },
    {
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 311,
      "title": "🛡️ Sentinel: [Medium] Fix insecure error logging exposing stack traces in API routes",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/311"
    },
    {
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 309,
      "title": "🎨 Palette: Improve accessibility of loading states in creator components",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/309"
    },
    {
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 308,
      "title": "💸 Audit package metadata and source-of-funds truth",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/308"
    },
    {
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 307,
      "title": "🧱 Reduce monolith file risk and clarify responsibility boundaries",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/307"
    },
    {
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 306,
      "title": "🛡️ Sentinel: [MEDIUM] Replace console.warn with secure recordRouteWarning in creator settings API",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/306"
    },
    {
      "isDraft": false,
      "mergeStateStatus": "CLEAN",
      "number": 305,
      "title": "🎨 Palette: Add aria-busy to async buttons",
      "url": "https://github.com/omgitsguppey/kandylandv2/pull/305"
    }
  ],
  "blockingOpenPrCount": 0,
  "unclassifiedOpenPrCount": 0,
  "validationFailures": []
}
```
