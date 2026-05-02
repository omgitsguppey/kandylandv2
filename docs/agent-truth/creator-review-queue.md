# Creator Review Queue

Status: launch hardening doctrine. Source of truth remains verified runtime code.

## Doctrine

`creator_review_queue/{uid}` is a deterministic projection of `creator_onboarding/{uid}`. It is not a loose roster filter, not an ad hoc status blob, and not a replacement source of truth.

The canonical source remains:

- `creator_onboarding/{uid}`
- `creator_onboarding/{uid}/history/{eventId}`

The projection owner is:

- `src/lib/server/creator-review-queue.ts`

## Materializer

The queue materializer exposes:

- `materializeCreatorReviewQueueEntry(userId)`
- `removeCreatorReviewQueueEntry(userId, reason)`
- `rebuildCreatorReviewQueueForUser(userId)`
- `compareOnboardingToQueue(userId)`
- `materializeCreatorReviewQueueEntryForTransaction(...)`

`syncCreatorOnboardingDocuments(...)` must call the transaction materializer whenever canonical onboarding changes. Creator signup, creator intake updates, agreement send/sign/countersign, ID updates, approval changes, owner override changes, and role activation all flow through that sync path.

## Required Projection Fields

Every materialized queue entry must include:

- `userId`
- `onboardingRefPath`
- `queueBucket`
- `queueSortAt`
- `queuePosition`
- `displayName`
- `creatorDisplayName`
- `creatorPrimaryPlatform`
- `creatorContentFocus`
- `email`
- `username`
- `photoURL`
- `role`
- `submissionStatus`
- `approvalStatus`
- `legalStatus`
- `idVerificationStatus`
- `segmentationStatus`
- `contractDocumentStatus`
- `creatorSignatureStatus`
- `adminSignatureStatus`
- `agreementBasis`
- `readyForApproval`
- `creatorReviewQueueVisible`
- `blockingReasons`
- `submittedAt`
- `updatedAt`
- `adminNotes`
- `idDocumentCount`

## Queue Buckets

Queue buckets are derived from canonical onboarding state:

- `approved`: creator is approved or already has creator role
- `rejected`: creator was rejected
- `needs_changes`: admin requested changes
- `ready_for_approval`: all approval prerequisites are complete and approval is pending
- `waiting_on_id`: ID request, upload, or review is incomplete
- `waiting_on_legal`: agreement send, creator signature, admin countersign, or legal completion is incomplete
- `newest_submissions`: newly submitted or otherwise waiting for the next deterministic step

Role `user` applicants must remain eligible for the review queue. The roster must not depend on `role === creator` to find applicants.

## Debug And Parity

Queue records expose:

- `queueMaterializedAt`
- `sourceOnboardingUpdatedAt`
- `projectionLagMs`
- `queueParityOk`
- `queueParityDelta`

`compareOnboardingToQueue(userId)` compares canonical onboarding with the materialized queue projection. Any stale or missing projection should be visible through Admin Debug and validation, not hidden by roster filtering.

## Forbidden Patterns

Do not write `creator_review_queue/{uid}` as a hand-built status blob.

Do not filter Admin Roster applicants by creator role only.

Do not treat `creator_review_queue/{uid}` as canonical when `creator_onboarding/{uid}` exists.

Do not clear canonical onboarding or user-facing projection data because a queue materialization fails. Queue projection failures belong in diagnostics and Debug.
