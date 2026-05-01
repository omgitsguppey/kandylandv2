export type ProblemStateSeverity = "info" | "warning" | "error";

export type ProblemStateCopy = {
  headline: string;
  body: string;
  actionLabel: string;
  severity: ProblemStateSeverity;
  technicalReason: string;
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
