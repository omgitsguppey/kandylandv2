import type { CreatorOnboardingApprovalStatus } from "@/lib/creator-onboarding";
import { buildCreatorPublicHref } from "@/lib/creator-profile-routing";

export const CREATOR_ACCOUNT_CONTROL_ROLES = ["user", "creator", "admin"] as const;
export type CreatorAccountControlRole = (typeof CREATOR_ACCOUNT_CONTROL_ROLES)[number];

export const CREATOR_ACCOUNT_CONTROL_STATUSES = ["active", "suspended", "banned"] as const;
export type CreatorAccountControlStatus = (typeof CREATOR_ACCOUNT_CONTROL_STATUSES)[number];

export const CREATOR_ACCOUNT_CONTROL_ACTIONS = [
  "update_profile",
  "update_email",
  "create_password_reset_link",
  "set_temporary_password",
  "update_role",
  "update_status",
  "update_notification_settings",
] as const;

export type CreatorAccountControlAction = (typeof CREATOR_ACCOUNT_CONTROL_ACTIONS)[number];

export type CreatorAccountControlCommand =
  | {
    action: "update_profile";
    targetUserId: string;
    displayName?: string;
    username?: string;
  }
  | {
    action: "update_email";
    targetUserId: string;
    email: string;
    confirmed: boolean;
  }
  | {
    action: "create_password_reset_link";
    targetUserId: string;
    confirmed: boolean;
  }
  | {
    action: "set_temporary_password";
    targetUserId: string;
    temporaryPassword: string;
    confirmed: boolean;
  }
  | {
    action: "update_role";
    targetUserId: string;
    role: CreatorAccountControlRole;
    confirmed: boolean;
  }
  | {
    action: "update_status";
    targetUserId: string;
    status: CreatorAccountControlStatus;
    statusReason?: string;
    confirmed: boolean;
  }
  | {
    action: "update_notification_settings";
    targetUserId: string;
    notificationSettings: CreatorAccountNotificationSettings;
  };

export type CreatorAccountNotificationSettings = {
  inAppEnabled?: boolean;
  browserPushEnabled?: boolean;
  newDropAlerts?: boolean;
  expiringSoonAlerts?: boolean;
};

export type CreatorAccountControlParseResult =
  | { ok: true; command: CreatorAccountControlCommand }
  | { ok: false; error: string };

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(value: unknown) {
  return value === true;
}

function isRole(value: string): value is CreatorAccountControlRole {
  return CREATOR_ACCOUNT_CONTROL_ROLES.includes(value as CreatorAccountControlRole);
}

function isStatus(value: string): value is CreatorAccountControlStatus {
  return CREATOR_ACCOUNT_CONTROL_STATUSES.includes(value as CreatorAccountControlStatus);
}

function readNotificationSettings(value: unknown): CreatorAccountNotificationSettings {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return {
    inAppEnabled: typeof source.inAppEnabled === "boolean" ? source.inAppEnabled : undefined,
    browserPushEnabled: typeof source.browserPushEnabled === "boolean" ? source.browserPushEnabled : undefined,
    newDropAlerts: typeof source.newDropAlerts === "boolean" ? source.newDropAlerts : undefined,
    expiringSoonAlerts: typeof source.expiringSoonAlerts === "boolean" ? source.expiringSoonAlerts : undefined,
  };
}

export function parseCreatorAccountControlCommand(body: unknown): CreatorAccountControlParseResult {
  const source = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {};
  const targetUserId = readString(source.targetUserId);
  const action = readString(source.action) as CreatorAccountControlAction;

  if (!targetUserId) {
    return { ok: false, error: "Select a creator before changing account controls." };
  }

  if (!CREATOR_ACCOUNT_CONTROL_ACTIONS.includes(action)) {
    return { ok: false, error: "Choose a valid account control action." };
  }

  if (action === "update_profile") {
    const displayName = readString(source.displayName);
    const username = readString(source.username).toLowerCase();
    if (!displayName && !username) {
      return { ok: false, error: "Enter a display name or handle to update." };
    }
    if (displayName && displayName.length < 2) {
      return { ok: false, error: "Display name must be at least 2 characters." };
    }
    return {
      ok: true,
      command: {
        action,
        targetUserId,
        displayName: displayName || undefined,
        username: username || undefined,
      },
    };
  }

  if (action === "update_email") {
    const email = readString(source.email).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
      return { ok: false, error: "Enter a valid email address." };
    }
    return { ok: true, command: { action, targetUserId, email, confirmed: readBoolean(source.confirmed) } };
  }

  if (action === "create_password_reset_link") {
    return { ok: true, command: { action, targetUserId, confirmed: readBoolean(source.confirmed) } };
  }

  if (action === "set_temporary_password") {
    const temporaryPassword = readString(source.temporaryPassword);
    if (temporaryPassword.length < 8) {
      return { ok: false, error: "Temporary password must be at least 8 characters." };
    }
    return { ok: true, command: { action, targetUserId, temporaryPassword, confirmed: readBoolean(source.confirmed) } };
  }

  if (action === "update_role") {
    const role = readString(source.role) as CreatorAccountControlRole;
    if (!isRole(role)) {
      return { ok: false, error: "Choose a valid role." };
    }
    return { ok: true, command: { action, targetUserId, role, confirmed: readBoolean(source.confirmed) } };
  }

  if (action === "update_status") {
    const status = readString(source.status) as CreatorAccountControlStatus;
    if (!isStatus(status)) {
      return { ok: false, error: "Choose a valid account status." };
    }
    return {
      ok: true,
      command: {
        action,
        targetUserId,
        status,
        statusReason: readString(source.statusReason) || undefined,
        confirmed: readBoolean(source.confirmed),
      },
    };
  }

  return {
    ok: true,
    command: {
      action,
      targetUserId,
      notificationSettings: readNotificationSettings(source.notificationSettings),
    },
  };
}

export function isDangerousCreatorAccountAction(action: CreatorAccountControlAction) {
  return action === "update_email"
    || action === "create_password_reset_link"
    || action === "set_temporary_password"
    || action === "update_role"
    || action === "update_status";
}

export function creatorAccountActionField(action: CreatorAccountControlAction) {
  switch (action) {
    case "update_profile":
      return "profile";
    case "update_email":
      return "email";
    case "create_password_reset_link":
      return "passwordReset";
    case "set_temporary_password":
      return "temporaryPassword";
    case "update_role":
      return "role";
    case "update_status":
      return "status";
    case "update_notification_settings":
      return "notificationSettings";
    default:
      return "account";
  }
}

export function redactAccountControlValue(field: string, value: unknown) {
  if (field.toLowerCase().includes("password")) {
    return "[password hidden]";
  }

  const text = readString(value);
  if (!text) {
    return "";
  }

  if (field === "email") {
    const [name, domain] = text.split("@");
    if (!name || !domain) {
      return "[email hidden]";
    }
    return `${name.slice(0, 1)}***@${domain}`;
  }

  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

export function formatCreatorAccountRole(role: CreatorAccountControlRole) {
  if (role === "creator") {
    return "Creator";
  }
  if (role === "admin") {
    return "Admin";
  }
  return "User";
}

export function formatCreatorAccountStatus(status: CreatorAccountControlStatus) {
  if (status === "suspended") {
    return "Suspended";
  }
  if (status === "banned") {
    return "Banned";
  }
  return "Active";
}

export function formatCreatorApprovalStatus(status: CreatorOnboardingApprovalStatus) {
  if (status === "creator_approved") {
    return "Approved";
  }
  if (status === "creator_rejected") {
    return "Not approved";
  }
  if (status === "creator_needs_changes") {
    return "Needs changes";
  }
  return "Needs review";
}

export function buildCreatorPublicProfilePath(username?: string | null) {
  return buildCreatorPublicHref({ username, creatorUsername: username }) ?? "";
}
