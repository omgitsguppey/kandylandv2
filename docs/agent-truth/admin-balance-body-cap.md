# Admin Balance Body Cap

Generated source-only Batch 9 evidence. No production reads, deploys, provider calls, payment runtime changes, or GumDrop math changes were performed.

```json
{
  "generatedAtUtc": "2026-05-24T18:18:28.505Z",
  "reportKey": "admin-balance-body-cap",
  "currentHead": "aa6815f74070c955ed53585f76a36c4d52065cd0",
  "routePath": "src/app/api/admin/balance/route.ts",
  "adminBalanceBodyCapBefore": "missing_direct_request_json",
  "adminBalanceBodyCapAfter": "bounded_parser_cap_8192",
  "boundedParserUsed": "readBoundedJsonBody",
  "maxBytes": 8192,
  "directRequestJsonRemaining": false,
  "gumdropMathChanged": false,
  "authGuardChanged": false,
  "amountBoundsUnchanged": true,
  "reasonBoundsUnchanged": true,
  "routeRuntimeHealthWrapped": true,
  "allowedContentTypes": true,
  "humanSafeBoundedErrors": true,
  "validationFailures": []
}
```
