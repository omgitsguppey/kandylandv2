# Chat Media Limits

## Canonical limits

- Standard chat upload max: `25 MB` per file.
- Fan Pass chat upload max: `500 MB` per file.
- Fan Pass only changes upload size allowance.
- Fan Pass does not mint paid GumDrops.
- Fan Pass does not bypass paid-GD chat cost unless `subscriberFreeChatApplies` is explicitly true by creator policy.

## Enforcement

- Client enforces limits before upload start.
- Server enforces limits in attachment prepare and complete routes.
- Expected typed error codes:
  - `file_too_large`
  - `file_too_large_requires_fan_pass`
  - `fan_pass_file_limit_exceeded`
