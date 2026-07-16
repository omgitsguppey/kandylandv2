# Creator Discovery Relationship Funnel

Generated: 2026-07-16T04:25:41.030Z

Status: pass

## Summary

- Events: 13
- States: 7
- Creator card/profile funnel tracked: true
- Follow/unfollow telemetry triplet: true
- Recommendation impressions/clicks tracked: true
- Relationship route debug-visible: true
- Person/global metric mapping: true
- Production reads performed by validator: false
- Provider calls performed by validator: false
- Payment/GumDrop math changed: false

## Debug Lane

- Label: Creator discovery/relationships
- Follow failures: 1
- Relationship list failures: 1
- Empty recommendation state: 1
- Profile route missing: 1
- Recommendation source health: review

## Events

| Event | Status |
| --- | --- |
| creator_discovery_surface_viewed | registered |
| creator_card_viewed | registered |
| creator_card_clicked | registered |
| creator_profile_opened | registered |
| creator_follow_attempted | registered |
| creator_follow_succeeded | registered |
| creator_follow_failed | registered |
| creator_unfollow_attempted | registered |
| creator_unfollow_succeeded | registered |
| creator_recommendation_viewed | registered |
| creator_recommendation_clicked | registered |
| creator_relationship_list_loaded | registered |
| creator_relationship_list_failed | registered |

## States

| State | Status |
| --- | --- |
| not_following | covered |
| following | covered |
| blocked | covered |
| unavailable | covered |
| self | covered |
| creator_hidden | covered |
| unknown | covered |

## Dirty Files

| File | Classification |
| --- | --- |
| none | none |

## Validation Failures

- None
