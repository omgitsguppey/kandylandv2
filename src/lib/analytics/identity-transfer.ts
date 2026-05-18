import {
  ANALYTICS_IDENTITY_ACTOR_TYPES,
  ANALYTICS_IDENTITY_STATES,
  GUEST_USER_IDENTITY_LINK_STORAGE_PREFIX,
  GUEST_USER_IDENTITY_TRANSFER_ROUTE,
  buildIdentityLink,
  buildIdentityLinkPayload,
  createIdentityLinkStorageKey,
  hasSubmittedIdentityLink,
  markIdentityLinkSubmitted,
  shouldSubmitIdentityLink,
  type AnalyticsIdentityActorType,
  type AnalyticsIdentityState,
  type GuestUserIdentityLink,
  type GuestUserIdentityLinkReason,
  type IdentityLinkSubmitResult,
} from "@/lib/analytics/analytics-identity-link";

export {
  ANALYTICS_IDENTITY_ACTOR_TYPES,
  ANALYTICS_IDENTITY_STATES,
  GUEST_USER_IDENTITY_LINK_STORAGE_PREFIX,
  GUEST_USER_IDENTITY_TRANSFER_ROUTE,
  buildIdentityLink,
  buildIdentityLinkPayload,
  createIdentityLinkStorageKey,
  hasSubmittedIdentityLink,
  markIdentityLinkSubmitted,
  shouldSubmitIdentityLink,
};

export type {
  AnalyticsIdentityActorType,
  AnalyticsIdentityState,
  GuestUserIdentityLinkReason,
  IdentityLinkSubmitResult,
};

export type AnalyticsIdentityLink = GuestUserIdentityLink;
export type AnalyticsIdentityTransferInput = Parameters<typeof buildIdentityLink>[0];

export function buildAnalyticsIdentityLink(input: AnalyticsIdentityTransferInput): AnalyticsIdentityLink {
  return buildIdentityLink(input);
}

export function getAnalyticsIdentityLinkId(
  input: AnalyticsIdentityTransferInput | Pick<AnalyticsIdentityLink, "identityLinkId">,
) {
  if ("identityLinkId" in input && input.identityLinkId) {
    return input.identityLinkId;
  }

  return buildIdentityLink(input as AnalyticsIdentityTransferInput).identityLinkId;
}
