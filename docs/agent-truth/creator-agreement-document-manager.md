# Creator agreement document manager

Status: Launch admin legal-evidence doctrine
Last updated: 2026-05-02

## Doctrine

Creator agreements are versioned documents, not mutable page copy. Admins may save a new template source, activate a template for future creators, send the active agreement to one creator, send an updated agreement, and countersign only the version/hash the creator signed.

Do not hardcode uploaded PDF bytes in code. Uploaded source files live in Storage, while Firestore stores template metadata, immutable dispatch records, and signature evidence.

## Data Owners

- `src/lib/creator-agreement-documents.ts` owns shared template, dispatch, signature, hash, and admin-view contracts.
- `src/lib/server/creator-agreement-templates.ts` loads and activates the active template from `creator_agreement_templates`.
- `src/lib/server/creator-agreement-documents.ts` sends creator-specific dispatches, supersedes prior dispatches, countersigns matching dispatches, writes onboarding history, and records Debug diagnostics.
- `src/app/api/admin/creator-agreements/route.ts` is the guarded admin route for template create/activate, dispatch send/update, countersign, and admin preview download.
- `src/app/api/creator/onboarding/agreement-document/route.ts` lets a signed-in creator view only the uploaded agreement source tied to their own sent agreement version/hash.

## Admin Roster

The selected creator panel keeps `Agreement document` collapsed by default. Visible fields are:

- Current agreement version
- Document title
- Last sent
- Creator signature
- Admin countersign
- Full document available
- Agreement hash available

Visible actions are `View agreement`, `Send agreement`, `Send updated agreement`, and `Countersign agreement`.

The Create tab contains a collapsed `Agreement templates` area for:

- Current creator agreement version
- Upload or replace agreement source
- Set active agreement version
- Preview active agreement
- Mark as active for new creators

Storage paths and raw document paths are Debug-only. Main UI may show availability, version, title, and hash availability, but never raw Storage paths.

## Version And Evidence Rules

- The active document new creators see is seeded into canonical creator onboarding as `contractVersion`, `agreementTemplateId`, `agreementTitle`, `agreementHash`, and `agreementSource`.
- Updating the active template does not mutate previously signed records.
- Sending an updated agreement creates a new dispatch and supersedes the previous dispatch record.
- A new dispatch sets creator/admin signatures back to pending for that dispatch.
- Creator signatures and admin countersignatures store the same `agreementVersion`, `templateId`, `agreementHash`, and `dispatchId`.
- Admin countersign is blocked until the creator signature is recorded.

## Telemetry

Admin agreement lifecycle events are:

- `admin_creator_agreement_template_created`
- `admin_creator_agreement_template_activated`
- `admin_creator_agreement_sent`
- `admin_creator_agreement_update_sent`
- `admin_creator_agreement_countersigned`

Payloads include actor markers, `targetUserId` when applicable, `agreementVersion`, `agreementHash`, `templateId`, `performedAs`, and route `/admin/roster`.

## Debug Fields

Agreement diagnostics should expose:

- `activeAgreementVersion`
- `activeAgreementHash`
- `selectedCreatorAgreementVersion`
- `selectedCreatorAgreementHash`
- `dispatchStatus`
- `signatureEvidenceComplete`
- `priorAgreementPreserved`
- `requiresResign`

## Validation

Run:

```bash
npm run check:creator-agreement-document-manager
npx vitest run tests/unit/creator-agreement-documents.spec.ts tests/unit/admin-creator-agreements-route.spec.ts tests/unit/creator-contract-signature-route.spec.ts tests/unit/admin-roster-decision-queue.spec.ts
```

Future agents must not bypass the template/dispatch/signature contract by patching `creatorApplication` legal fields directly.
