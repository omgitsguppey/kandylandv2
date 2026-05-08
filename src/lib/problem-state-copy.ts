export type ProblemStateSeverity = "info" | "warning" | "error";

export type ProblemStateCopy = {
  headline: string;
  body: string;
  actionLabel: string;
  severity: ProblemStateSeverity;
  technicalReason: string;
};

export type CreatorBookingProblemPayload = {
  code?: unknown;
  error?: unknown;
  message?: unknown;
  shortfallGd?: unknown;
};

export type CreatorSubscriptionProblemPayload = CreatorBookingProblemPayload & {
  priceGd?: unknown;
  paidBalanceGd?: unknown;
};

export type CreatorRequestProblemPayload = CreatorBookingProblemPayload & {
  priceGd?: unknown;
  paidBalanceGd?: unknown;
};

function normalizeReason(reason: unknown) {
  if (typeof reason === "string") {
    return reason.trim();
  }

  if (reason instanceof Error) {
    return reason.message.trim();
  }

  return "";
}

function lowerReason(reason: unknown) {
  return normalizeReason(reason).toLowerCase();
}

function normalizeProblemCode(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function readCreatorBookingProblemPayload(value: unknown): CreatorBookingProblemPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as CreatorBookingProblemPayload;
}

function readCreatorSubscriptionProblemPayload(value: unknown): CreatorSubscriptionProblemPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as CreatorSubscriptionProblemPayload;
}

function readCreatorRequestProblemPayload(value: unknown): CreatorRequestProblemPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as CreatorRequestProblemPayload;
}

function normalizePositiveInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}

function copy(
  technicalReason: unknown,
  headline: string,
  body: string,
  actionLabel: string,
  severity: ProblemStateSeverity = "error",
): ProblemStateCopy {
  return {
    headline,
    body,
    actionLabel,
    severity,
    technicalReason: normalizeReason(technicalReason) || "not recorded",
  };
}

export function getPageProblemCopy(reason?: unknown): ProblemStateCopy {
  const normalized = lowerReason(reason);

  if (normalized.includes("chunkloaderror") || normalized.includes("loading chunk")) {
    return copy(
      reason,
      "Page needs a refresh.",
      "KandyDrops has a newer page version ready. Reload to continue.",
      "Reload page",
      "warning",
    );
  }

  return copy(
    reason,
    "Page could not load.",
    "Refresh the page or retry the last action.",
    "Refresh page",
  );
}

export function getPaymentProblemCopy(reason?: unknown): ProblemStateCopy {
  const normalized = lowerReason(reason);

  if (normalized.includes("not authenticated")) {
    return copy(
      reason,
      "Sign in to refill.",
      "Create or open your account before adding GumDrops.",
      "Sign in",
      "warning",
    );
  }

  if (normalized.includes("not completed")) {
    return copy(
      reason,
      "Payment was not completed.",
      "Start checkout again when PayPal is ready.",
      "Retry checkout",
      "warning",
    );
  }

  if (
    normalized.includes("package mismatch") ||
    normalized.includes("invalid payment") ||
    normalized.includes("user verification") ||
    normalized.includes("verification failed")
  ) {
    return copy(
      reason,
      "Checkout could not be verified.",
      "Your wallet was not changed. Start checkout again from Wallet.",
      "Retry checkout",
    );
  }

  if (normalized.includes("database not available") || normalized.includes("service unavailable")) {
    return copy(
      reason,
      "Wallet service is unavailable.",
      "Your wallet was not changed. Try again shortly.",
      "Try again",
    );
  }

  if (normalized.includes("paypal")) {
    return copy(
      reason,
      "PayPal is not ready.",
      "Close and reopen Wallet, then start checkout again.",
      "Retry checkout",
      "warning",
    );
  }

  return copy(
    reason,
    "Purchase could not be completed.",
    "Your wallet was not changed. Try again or contact support if PayPal charged you.",
    "Try again",
  );
}

export function getUnlockProblemCopy(reason?: unknown): ProblemStateCopy {
  const normalized = lowerReason(reason);

  if (normalized.includes("not enough") || normalized.includes("insufficient_funds")) {
    return copy(
      reason,
      "More GumDrops are needed.",
      "Refill your wallet, then unwrap this Drop again.",
      "Refill GumDrops",
      "warning",
    );
  }

  if (normalized.includes("subscription_required") || normalized.includes("active subscription")) {
    return copy(
      reason,
      "Creator subscription required.",
      "Join this Creator's subscription before unwrapping the Drop.",
      "Open Creator",
      "warning",
    );
  }

  if (normalized.includes("drop not found")) {
    return copy(
      reason,
      "Drop is unavailable.",
      "Return to Drops and choose another release.",
      "Open Drops",
      "warning",
    );
  }

  if (normalized.includes("invalid drop")) {
    return copy(
      reason,
      "Drop cannot be unwrapped yet.",
      "Your GumDrops were not charged. Try another Drop or check back later.",
      "Try another Drop",
      "warning",
    );
  }

  if (normalized.includes("user not found") || normalized.includes("not authenticated")) {
    return copy(
      reason,
      "Sign in again to unwrap.",
      "Your GumDrops were not charged. Open your account and retry.",
      "Sign in",
      "warning",
    );
  }

  if (normalized.includes("database not available") || normalized.includes("service unavailable")) {
    return copy(
      reason,
      "Unlocks are unavailable.",
      "Your GumDrops were not charged. Try again shortly.",
      "Try again",
    );
  }

  return copy(
    reason,
    "Drop could not be unwrapped.",
    "Your GumDrops were not charged. Try again shortly.",
    "Try again",
  );
}

export function getCreatorBookingProblemCopy(reason?: unknown) {
  const payload = readCreatorBookingProblemPayload(reason);
  const code = normalizeProblemCode(payload.code);
  const fallbackReason = normalizeReason(payload.message) || normalizeReason(payload.error) || normalizeReason(reason);
  const normalized = `${code} ${fallbackReason}`.toLowerCase();

  if (code === "slot_outside_availability" || normalized.includes("outside") && normalized.includes("availability")) {
    return "Pick a time inside the creator's booking hours.";
  }

  if (code === "creator_availability_not_configured") {
    return "This creator has not opened booking hours yet.";
  }

  if (code === "slot_already_booked" || normalized.includes("already booked")) {
    return "That time was just booked. Pick another slot.";
  }

  if (code === "bookings_unavailable" || normalized.includes("bookings are not available")) {
    return "Bookings are not available for this creator right now.";
  }

  if (code === "insufficient_paid_gumdrops" || normalized.includes("insufficient") && normalized.includes("purchased")) {
    const shortfallGd = normalizePositiveInteger(payload.shortfallGd);
    return shortfallGd > 0
      ? `You need ${shortfallGd} more paid GD to book this.`
      : "You need more paid GD to book this.";
  }

  if (code === "creator_unavailable") {
    return "This creator is unavailable right now.";
  }

  if (code === "invalid_booking_request") {
    return "Check the booking details and try again.";
  }

  if (code === "creator_or_user_not_found") {
    return "This creator booking could not be found.";
  }

  if (code === "unauthorized") {
    return "Sign in to book creator live time.";
  }

  return "Booking could not be completed. Try again or report the issue.";
}

export function getCreatorSubscriptionProblemCopy(reason?: unknown) {
  const payload = readCreatorSubscriptionProblemPayload(reason);
  const code = normalizeProblemCode(payload.code);
  const fallbackReason = normalizeReason(payload.message) || normalizeReason(payload.error) || normalizeReason(reason);
  const normalized = `${code} ${fallbackReason}`.toLowerCase();

  if (code === "insufficient_paid_gumdrops" || normalized.includes("insufficient") && normalized.includes("purchased")) {
    const shortfallGd = normalizePositiveInteger(payload.shortfallGd);
    return shortfallGd > 0
      ? `You need ${shortfallGd} more paid GD to start this Fan Pass.`
      : "You need more paid GD to start this Fan Pass.";
  }

  if (code === "subscriptions_unavailable" || normalized.includes("subscriptions are unavailable")) {
    return "Fan Pass is not available for this creator right now.";
  }

  if (code === "creator_unavailable") {
    return "This creator is unavailable right now.";
  }

  if (code === "creator_or_user_not_found") {
    return "We could not find this creator.";
  }

  if (code === "invalid_subscription_request") {
    return "Check the Fan Pass details and try again.";
  }

  if (code === "unauthorized") {
    return "Sign in to start this Fan Pass.";
  }

  return "Fan Pass could not be updated. Try again or report the issue.";
}

export function getCreatorRequestProblemCopy(reason?: unknown) {
  const payload = readCreatorRequestProblemPayload(reason);
  const code = normalizeProblemCode(payload.code);
  const fallbackReason = normalizeReason(payload.message) || normalizeReason(payload.error) || normalizeReason(reason);
  const normalized = `${code} ${fallbackReason}`.toLowerCase();

  if (code === "insufficient_paid_gumdrops" || normalized.includes("insufficient") && normalized.includes("purchased")) {
    const shortfallGd = normalizePositiveInteger(payload.shortfallGd);
    return shortfallGd > 0
      ? `You need ${shortfallGd} more paid GD to send this request.`
      : "You need more paid GD to send this request.";
  }

  if (code === "requests_unavailable" || normalized.includes("custom requests are unavailable")) {
    return "Custom requests are not available for this creator right now.";
  }

  if (code === "creator_unavailable") {
    return "This creator is unavailable right now.";
  }

  if (code === "creator_or_user_not_found") {
    return "We could not find this creator.";
  }

  if (code === "invalid_request") {
    return "Check the request details and try again.";
  }

  if (code === "unauthorized") {
    return "Sign in to send a custom request.";
  }

  return "Custom request could not be sent. Try again or report the issue.";
}

export function getNotificationProblemCopy(reason?: unknown): ProblemStateCopy {
  const normalized = lowerReason(reason);

  if (normalized.includes("permission") || normalized.includes("blocked")) {
    return copy(
      reason,
      "Notifications are blocked.",
      "Enable notifications in your browser settings to receive Drop alerts.",
      "Open settings",
      "warning",
    );
  }

  return copy(
    reason,
    "Notifications are unavailable.",
    "Refresh this panel to check for new updates.",
    "Refresh",
    "warning",
  );
}
