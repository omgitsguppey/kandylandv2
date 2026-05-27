# User Journey Behavioral Intelligence

Artifact: `agent/state/user-journey-behavioral-intelligence.generated.json`

- Generated: `2026-05-27T00:55:34.822Z`
- Current head: `7747ca78ac19f78c396f9c5c50301347ce492a45`

```json
{
  "generatedAtUtc": "2026-05-27T00:55:34.822Z",
  "reportKey": "user-journey-behavioral-intelligence",
  "currentHead": "7747ca78ac19f78c396f9c5c50301347ce492a45",
  "status": "fail",
  "productionReadsRequired": false,
  "legacyMutationAllowed": false,
  "fakeJourneysUsed": false,
  "rawSensitivePayloadStored": false,
  "scoreBefore": {
    "sourceHealth": 100,
    "runtimeHealth": 84.2,
    "evidenceCompleteness": 84.6,
    "freshness": 91.88,
    "costRisk": 42,
    "regressionRisk": 86,
    "overallHealthScore": 85.34
  },
  "scoreAfter": {
    "sourceHealth": 100,
    "runtimeHealth": 84.2,
    "evidenceCompleteness": 84.6,
    "freshness": 91.88,
    "costRisk": 42,
    "regressionRisk": 86,
    "overallHealthScore": 85.34
  },
  "metrics": {
    "sourceHealth": {
      "before": 100,
      "after": 100,
      "target": 80,
      "status": "target_met",
      "nextExactAction": "No user journey score action needed for this dimension."
    },
    "runtimeHealth": {
      "before": 84.2,
      "after": 84.2,
      "target": 80,
      "status": "target_met",
      "nextExactAction": "No user journey score action needed for this dimension."
    },
    "evidenceCompleteness": {
      "before": 84.6,
      "after": 84.6,
      "target": 80,
      "status": "target_met",
      "nextExactAction": "No user journey score action needed for this dimension."
    },
    "freshness": {
      "before": 91.88,
      "after": 91.88,
      "target": 80,
      "status": "target_met",
      "nextExactAction": "No user journey score action needed for this dimension."
    },
    "costRisk": {
      "before": 42,
      "after": 42,
      "target": 80,
      "status": "below_target",
      "nextExactAction": "Resolve formal beta score gates outside user journey summaries; do not fake journey activity or runtime evidence."
    },
    "regressionRisk": {
      "before": 86,
      "after": 86,
      "target": 80,
      "status": "target_met",
      "nextExactAction": "No user journey score action needed for this dimension."
    },
    "overallHealthScore": {
      "before": 85.34,
      "after": 85.34,
      "target": 80,
      "status": "target_met",
      "nextExactAction": "No user journey score action needed for this dimension."
    }
  },
  "coreFunnels": [
    "landing_to_signup",
    "signup_to_first_unwrap",
    "wallet_to_checkout_to_payment",
    "drop_view_to_unlock_to_watch",
    "creator_profile_to_fan_pass_chat_follow",
    "notification_prompt_to_permission",
    "daily_task_to_reward",
    "chat_open_to_message_outcome"
  ],
  "debugLane": {
    "label": "User journey",
    "journeyBuilderConnected": true,
    "brokenJourneySegments": 0,
    "missingNextActions": 0,
    "topFunnelsSourceReady": 8,
    "costGuardStatus": "batched_rollup",
    "rawDetailsDefaultOpen": false,
    "sourceOfTruth": "src/lib/behavioral/user-journey-builder.ts"
  },
  "sampleJourneyEvent": {
    "journeyEventId": "journey:session_validator:validator:drop_watch_completed",
    "eventId": "validator:drop_watch_completed",
    "sessionId": "session_validator",
    "linkedPersonId": "person_validator",
    "actorKind": "signed_in_user",
    "identityState": "logged_in_linked_guest",
    "identityConfidence": "linked",
    "timestamp": "2026-05-24T10:00:00.000Z",
    "route": "/dashboard/viewer",
    "surface": "viewer",
    "featureId": "viewer",
    "action": "watch_session_completed",
    "objectType": "drop",
    "objectId": "drop_validator",
    "durationMs": 15000,
    "activeMs": 12000,
    "sourceEventName": "drop_watch_completed",
    "previousJourneyEventId": null,
    "nextExpectedActions": [
      "drop_unlocked",
      "wallet_opened"
    ],
    "conversionTag": "drop_watch_completed",
    "failureTag": null,
    "confidence": 0.95,
    "privacyClass": "safe_summary"
  },
  "sessionSummary": {
    "sessionId": "session_validator",
    "linkedPersonId": "person_validator",
    "startedAt": "2026-05-24T10:00:00.000Z",
    "endedAt": "2026-05-24T10:00:15.000Z",
    "totalJourneyEvents": 7,
    "totalDurationMs": 39000,
    "totalActiveMs": 36000,
    "surfaces": [
      "viewer",
      "daily_checkin"
    ],
    "featureIds": [
      "viewer",
      "daily_checkin"
    ],
    "conversions": [
      "drop_watch_completed",
      "daily_task_rewarded"
    ],
    "failures": [],
    "confidence": "linked",
    "privacyClass": "private_content_redacted"
  },
  "personSummary": {
    "linkedPersonId": "person_validator",
    "sessionCount": 1,
    "totalJourneyEvents": 7,
    "totalActiveMs": 36000,
    "topFunnels": [
      "drop_view_to_unlock_to_watch",
      "daily_task_to_reward",
      "chat_open_to_message_outcome"
    ],
    "conversionTags": [
      "drop_watch_completed",
      "daily_task_rewarded"
    ],
    "failureTags": [],
    "identityConfidence": "linked",
    "privacyClass": "private_content_redacted"
  },
  "compactBehavioralInput": {
    "storageMode": "compact_summary",
    "rawFirehoseStored": false,
    "costGuard": "batched_rollup",
    "journeyEvents": [
      {
        "journeyEventId": "journey:session_validator:validator:drop_watch_completed",
        "eventId": "validator:drop_watch_completed",
        "sessionId": "session_validator",
        "linkedPersonId": "person_validator",
        "actorKind": "signed_in_user",
        "identityState": "logged_in_linked_guest",
        "identityConfidence": "linked",
        "timestamp": "2026-05-24T10:00:00.000Z",
        "route": "/dashboard/viewer",
        "surface": "viewer",
        "featureId": "viewer",
        "action": "watch_session_completed",
        "objectType": "drop",
        "objectId": "drop_validator",
        "durationMs": 15000,
        "activeMs": 12000,
        "sourceEventName": "drop_watch_completed",
        "previousJourneyEventId": null,
        "nextExpectedActions": [
          "drop_unlocked",
          "wallet_opened"
        ],
        "conversionTag": "drop_watch_completed",
        "failureTag": null,
        "confidence": 0.95,
        "privacyClass": "safe_summary"
      },
      {
        "journeyEventId": "journey:session_validator:validator:daily_task_reward_granted",
        "eventId": "validator:daily_task_reward_granted",
        "sessionId": "session_validator",
        "linkedPersonId": "person_validator",
        "actorKind": "signed_in_user",
        "identityState": "logged_in_linked_guest",
        "identityConfidence": "linked",
        "timestamp": "2026-05-24T10:00:15.000Z",
        "route": "/dashboard",
        "surface": "daily_checkin",
        "featureId": "daily_checkin",
        "action": "daily_task_reward_granted",
        "objectType": "task",
        "objectId": "task_validator",
        "durationMs": 4000,
        "activeMs": 4000,
        "sourceEventName": "daily_task_reward_granted",
        "previousJourneyEventId": "journey:session_validator:validator:drop_watch_completed",
        "nextExpectedActions": [
          "daily_task_started",
          "drop_preview_opened"
        ],
        "conversionTag": "daily_task_rewarded",
        "failureTag": null,
        "confidence": 0.8,
        "privacyClass": "safe_summary"
      },
      {
        "journeyEventId": "journey:session_validator:validator:daily_task_reward_granted",
        "eventId": "validator:chat_private",
        "sessionId": "session_validator",
        "linkedPersonId": "person_validator",
        "actorKind": "signed_in_user",
        "identityState": "logged_in_linked_guest",
        "identityConfidence": "linked",
        "timestamp": "2026-05-24T10:00:15.000Z",
        "route": "/dashboard",
        "surface": "daily_checkin",
        "featureId": "daily_checkin",
        "action": "chat_message_sent",
        "objectType": "chat",
        "objectId": "thread_validator",
        "durationMs": 4000,
        "activeMs": 4000,
        "sourceEventName": "chat_message_sent",
        "previousJourneyEventId": "journey:session_validator:validator:drop_watch_completed",
        "nextExpectedActions": [
          "daily_task_started",
          "drop_preview_opened"
        ],
        "conversionTag": "daily_task_rewarded",
        "failureTag": null,
        "confidence": 0.8,
        "privacyClass": "private_content_redacted"
      }
    ],
    "sessionSummaries": [
      {
        "sessionId": "session_validator",
        "linkedPersonId": "person_validator",
        "startedAt": "2026-05-24T10:00:00.000Z",
        "endedAt": "2026-05-24T10:00:15.000Z",
        "totalJourneyEvents": 3,
        "totalDurationMs": 23000,
        "totalActiveMs": 20000,
        "surfaces": [
          "viewer",
          "daily_checkin"
        ],
        "featureIds": [
          "viewer",
          "daily_checkin"
        ],
        "conversions": [
          "drop_watch_completed",
          "daily_task_rewarded"
        ],
        "failures": [],
        "confidence": "linked",
        "privacyClass": "private_content_redacted"
      }
    ],
    "personSummaries": [
      {
        "linkedPersonId": "person_validator",
        "sessionCount": 1,
        "totalJourneyEvents": 3,
        "totalActiveMs": 20000,
        "topFunnels": [
          "drop_view_to_unlock_to_watch",
          "daily_task_to_reward",
          "chat_open_to_message_outcome"
        ],
        "conversionTags": [
          "drop_watch_completed",
          "daily_task_rewarded"
        ],
        "failureTags": [],
        "identityConfidence": "linked",
        "privacyClass": "private_content_redacted"
      }
    ],
    "droppedLowImportanceCount": 4,
    "containsRawSensitivePayload": false
  },
  "dirtyFiles": [
    {
      "path": "CHANGELOG.md",
      "classification": "release_artifact_expected"
    },
    {
      "path": "agent/context/optimized-task-context.generated.json",
      "classification": "unrelated_agent_context_file_to_ignore"
    },
    {
      "path": "agent/state/event-liveness-audit.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/final-release-exit-readiness-packet.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/live-evidence-gate-replacement.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "agent/state/real-usage-confidence.generated.json",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "docs/agent-truth/event-liveness-audit.md",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "docs/agent-truth/final-release-exit-readiness-packet.md",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "docs/agent-truth/live-evidence-gate-replacement.md",
      "classification": "stale_generated_artifact_to_regenerate"
    },
    {
      "path": "package.json",
      "classification": "real_source_change_needs_review"
    },
    {
      "path": "public/kandydrops-release-notes.json",
      "classification": "release_artifact_expected"
    },
    {
      "path": "scripts/agent/validate-live-evidence-gate-replacement.ts",
      "classification": "unsafe_unknown"
    },
    {
      "path": "src/lib/release-notes/public-release-notes.ts",
      "classification": "release_artifact_expected"
    },
    {
      "path": "src/lib/release-notes/release-version-contract.ts",
      "classification": "release_artifact_expected"
    },
    {
      "path": "src/lib/release-readiness/final-release-readiness.ts",
      "classification": "unsafe_unknown"
    },
    {
      "path": "src/lib/release-readiness/live-evidence-gate-contract.ts",
      "classification": "unsafe_unknown"
    },
    {
      "path": "src/lib/release-readiness/live-evidence-resolver.ts",
      "classification": "unsafe_unknown"
    },
    {
      "path": "tests/unit/final-release-exit-readiness-packet.spec.ts",
      "classification": "unsafe_unknown"
    },
    {
      "path": "tests/unit/live-evidence-gate-replacement.spec.ts",
      "classification": "unsafe_unknown"
    }
  ],
  "validationFailures": [
    "dirty files are unclassified."
  ],
  "nextExactSteps": [
    "Feed normalized journey summaries from canonical event facts and rollups only.",
    "Keep raw payment/provider/chat/private payloads out of behavioral storage.",
    "Batch journey summaries and drop low-importance hover/scroll firehose events."
  ]
}
```
