# Analytics Ingest Identified Repair

Status: fixed_current
Failure class: deferred_materializer_failure_and_invalid_payload_retry_storm
Retryable status: expected_failures_retryable_false
Compatibility mode: identified_ingest_current

Expected invalid payloads now use typed non-retryable client responses, while deferred materializer/timeline failures are recorded as warning diagnostics after event fact persistence.
