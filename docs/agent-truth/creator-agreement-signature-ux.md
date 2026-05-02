# Creator agreement signature UX

Status: Launch creator-facing agreement doctrine
Last updated: 2026-05-02

## Doctrine

Creator signature is a full agreement review flow, not a summary-only checkbox. The creator page must show the sent agreement version, document title, last updated date, summary, required acknowledgements, full agreement sections, and signature evidence before a creator can sign.

The uploaded DNS Creator Service Agreement remains the operative source when a template dispatch uses an uploaded or hybrid source. Do not hardcode PDF bytes in code. The in-site viewer represents the full agreement through structured sections and links to the protected creator-scoped document route when a PDF source is available.

## Creator UI

The visible title is `Creator Service Agreement`.

The intro copy is:

`Review the full agreement before signing. Your signature, agreement version, timestamp, and device details are stored in the audit trail.`

The required review sections are:

- Summary
- Important acknowledgements
- Full agreement
- Signature

The full agreement viewer uses a table of contents and expandable sections. It must not be a tiny 48-page modal. The signature CTA stays above the mobile safe area.

## Required Acknowledgements

Creators cannot sign until all four acknowledgements are true:

- I understand creator tools activate only after approval.
- I understand KandyDrops may pause creator access for compliance, moderation, payout, or safety review.
- I understand my signed agreement version and signature record will be stored.
- I reviewed the full agreement before signing.

## Signature Gate

Signing is blocked unless:

- the creator is authenticated
- an active dispatch exists
- the agreement version exists
- the agreement hash exists
- the agreement content source is available
- the signature evidence passes `assertAgreementEvidenceComplete(...)` from `src/lib/creator-agreement-version.ts`
- signer name and email are available
- all required acknowledgements are true

The button copy is:

- `Review agreement to continue` before the gate is ready
- `Sign creator agreement` when the gate is ready
- `Agreement signed` after signature

After signing, the creator-facing subcopy is:

`Your agreement is recorded. Admin countersign and review may still be required before creator tools activate.`

## Evidence

Signature evidence stores:

- `dispatchId`
- `agreementVersion`
- `agreementHash`
- `signerUid`
- `signerName`
- `signerEmail`
- `signedAt`
- `signerIp`
- `signerUserAgent`
- `acknowledgementValues`
- `agreementSource`
- `pdfStoragePath`, `fullTextSnapshotPath`, or `embeddedFullTextReference`

Previous signatures must not be overwritten by a new agreement version. A new version creates a new dispatch and a new signature record.

The active agreement version is resolved only through `src/lib/creator-agreement-version.ts`. Creator-facing UI and signing routes must not hardcode the version literal. Existing creators keep the version/hash they signed; if the active template changes later, `compareSignedAgreementToActive(...)` may report `versionMatchesActive: false` while the signed record remains valid as long as creator and admin signatures match each other.

## Copy Rule

Creator-facing copy must not expose raw legal enum statuses. Use:

- Agreement not sent yet
- Ready to review
- Waiting for your signature
- Waiting for admin countersign
- Agreement complete

Debug and audit records may keep exact states such as `contract_sent`, `signature_pending`, `signature_signed`, `legal_sent`, and `legal_signed`.

## Telemetry

Creator agreement UX events are:

- `creator_agreement_viewed`
- `creator_agreement_section_opened`
- `creator_agreement_acknowledgement_checked`
- `creator_agreement_signed`

Payloads include actor marker fields, agreement version/hash, dispatch id, route `/creators/waitlist`, source `creator_agreement_signature_ux`, and section key when applicable.

The server keeps legacy lifecycle telemetry `creator_contract_signed` and writes onboarding history event `creator_contract_signed` for audit continuity.

## Validation

Run:

```bash
npm run check:creator-agreement-signature-ux
npx vitest run tests/unit/creator-agreement-signature-ux.spec.ts tests/unit/creator-contract-signature-route.spec.ts tests/unit/creator-waitlist-page.spec.tsx
```

Future agents must not replace the full agreement viewer with summary-only signature UI or sign without version/hash/dispatch evidence.
