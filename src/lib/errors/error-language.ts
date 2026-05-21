export type ErrorAudience = "user" | "creator" | "operator" | "debug";

export type ErrorSeverity = "info" | "warning" | "blocking" | "critical";

export type ErrorFixOwner = "user" | "creator" | "platform" | "provider" | "admin" | "unknown";

export type ErrorSurface =
  | "wallet"
  | "gumdrop_purchase"
  | "creator_profile"
  | "creator_booking"
  | "creator_request"
  | "fan_pass"
  | "creator_chat"
  | "creator_dashboard"
  | "creator_settings"
  | "creator_drops"
  | "admin_debug"
  | "admin_truth"
  | "analytics"
  | "drops"
  | "library"
  | "auth"
  | "navigation"
  | "runtime"
  | "unknown";

export type HumanErrorAction =
  | "retry"
  | "go_back"
  | "open_wallet"
  | "open_drops"
  | "open_creator_dashboard"
  | "sign_in"
  | "choose_another_slot"
  | "refresh"
  | "submit_bug"
  | "contact_support"
  | "none";

export type HumanErrorDescriptor = {
  errorKey: string;
  surface: ErrorSurface;
  severity: ErrorSeverity;
  owner: ErrorFixOwner;
  userTitle: string;
  userMessage: string;
  operatorMessage: string;
  primaryAction: HumanErrorAction;
  secondaryAction?: HumanErrorAction;
  bugReportEligible: boolean;
  rewardEligible: boolean;
  debugOnlyDetails?: string[];
};

export type HumanApiErrorPayload = {
  success: false;
  errorKey: string;
  userTitle: string;
  userMessage: string;
  operatorMessage?: string;
  primaryAction: HumanErrorAction;
  secondaryAction?: HumanErrorAction;
  bugReportEligible: boolean;
  rewardEligible: boolean;
  debugId?: string;
  previousSurface?: ErrorSurface;
  surface: ErrorSurface;
};
