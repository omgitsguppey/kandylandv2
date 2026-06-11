"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  CREATOR_ACCOUNT_CONTROL_ROLES,
  CREATOR_ACCOUNT_CONTROL_STATUSES,
  buildCreatorPublicProfilePath,
  formatCreatorAccountRole,
  formatCreatorAccountStatus,
  formatCreatorApprovalStatus,
  type CreatorAccountControlCommand,
  type CreatorAccountControlRole,
  type CreatorAccountControlStatus,
} from "@/lib/admin/creator-account-controls";
import type { CreatorOnboardingApprovalStatus } from "@/lib/creator-onboarding";

type NotificationSettings = {
  inAppEnabled?: boolean;
  browserPushEnabled?: boolean;
  newDropAlerts?: boolean;
  expiringSoonAlerts?: boolean;
};

export type CreatorAccountControlsTarget = {
  uid: string;
  displayName: string;
  email: string;
  username: string;
  role: CreatorAccountControlRole;
  status: CreatorAccountControlStatus;
  approvalStatus: CreatorOnboardingApprovalStatus;
  notificationSettings?: NotificationSettings;
};

export type CreatorAccountControlResult = {
  passwordResetLink?: string;
};

type Props = {
  target: CreatorAccountControlsTarget;
  isOwner: boolean;
  savingAction: string | null;
  onSubmit: (command: CreatorAccountControlCommand) => Promise<CreatorAccountControlResult | void>;
  onApprovalStatusChange: (status: CreatorOnboardingApprovalStatus) => Promise<void>;
};

const approvalOptions: CreatorOnboardingApprovalStatus[] = [
  "creator_pending",
  "creator_needs_changes",
  "creator_approved",
  "creator_rejected",
];

function FieldLabel(props: { children: string }) {
  return <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{props.children}</span>;
}

function textInputClass() {
  return "w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-brand-purple/60";
}

function selectClass() {
  return "w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-brand-purple/60";
}

export function CreatorAccountControlsPanel({
  target,
  isOwner,
  savingAction,
  onSubmit,
  onApprovalStatusChange,
}: Props) {
  const [displayName, setDisplayName] = useState(target.displayName);
  const [username, setUsername] = useState(target.username);
  const [email, setEmail] = useState(target.email);
  const [role, setRole] = useState<CreatorAccountControlRole>(target.role);
  const [status, setStatus] = useState<CreatorAccountControlStatus>(target.status);
  const [approvalStatus, setApprovalStatus] = useState<CreatorOnboardingApprovalStatus>(target.approvalStatus);
  const [statusReason, setStatusReason] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [resetLink, setResetLink] = useState("");
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(target.notificationSettings ?? {});

  /* eslint-disable react-hooks/set-state-in-effect -- Admin form fields intentionally reset when the selected creator target changes. */
  useEffect(() => {
    setDisplayName(target.displayName);
    setUsername(target.username);
    setEmail(target.email);
    setRole(target.role);
    setStatus(target.status);
    setApprovalStatus(target.approvalStatus);
    setStatusReason("");
    setTemporaryPassword("");
    setConfirmed(false);
    setResetLink("");
    setNotificationSettings(target.notificationSettings ?? {});
  }, [target]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const publicProfilePath = buildCreatorPublicProfilePath(username);
  const submit = async (command: CreatorAccountControlCommand) => {
    const result = await onSubmit(command);
    if (result?.passwordResetLink) {
      setResetLink(result.passwordResetLink);
    }
    if (command.action === "set_temporary_password") {
      setTemporaryPassword("");
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2">
          <FieldLabel>Display name</FieldLabel>
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={textInputClass()} />
        </label>
        <label className="space-y-2">
          <FieldLabel>Username / handle</FieldLabel>
          <input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} className={textInputClass()} />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => submit({ action: "update_profile", targetUserId: target.uid, displayName, username })}
          disabled={savingAction === "update_profile"}
          className="min-h-11 rounded-full bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
        >
          Save profile
        </button>
        {publicProfilePath ? (
          <Link href={publicProfilePath} className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm font-semibold text-white">
            Open public profile
          </Link>
        ) : null}
        <Link href={`/admin/user/${target.uid}`} className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm font-semibold text-white">
          Open user record
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2">
          <FieldLabel>Email</FieldLabel>
          <input value={email} onChange={(event) => setEmail(event.target.value)} className={textInputClass()} />
        </label>
        <label className="space-y-2">
          <FieldLabel>Temporary password</FieldLabel>
          <input
            value={temporaryPassword}
            onChange={(event) => setTemporaryPassword(event.target.value)}
            type="password"
            placeholder="Set only when needed"
            className={textInputClass()}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2">
          <FieldLabel>Role</FieldLabel>
          <select value={role} onChange={(event) => setRole(event.target.value as CreatorAccountControlRole)} className={selectClass()}>
            {CREATOR_ACCOUNT_CONTROL_ROLES.map((option) => (
              <option key={option} value={option} disabled={option === "admin" && !isOwner}>
                {formatCreatorAccountRole(option)}
              </option>
            ))}
          </select>
          {!isOwner ? <p className="text-xs leading-5 text-zinc-500">Only owner admin can grant admin access.</p> : null}
        </label>
        <label className="space-y-2">
          <FieldLabel>Account status</FieldLabel>
          <select value={status} onChange={(event) => setStatus(event.target.value as CreatorAccountControlStatus)} className={selectClass()}>
            {CREATOR_ACCOUNT_CONTROL_STATUSES.map((option) => (
              <option key={option} value={option}>{formatCreatorAccountStatus(option)}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="space-y-2">
        <FieldLabel>Status reason</FieldLabel>
        <input value={statusReason} onChange={(event) => setStatusReason(event.target.value)} placeholder="Internal reason when status changes" className={textInputClass()} />
      </label>

      <label className="flex min-h-11 items-start gap-3 rounded-2xl border border-brand-purple/25 bg-brand-purple/10 p-3 text-sm text-zinc-100">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-brand-purple" />
        <span>Confirm before changing login, role, or account access. These actions are audited.</span>
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => submit({ action: "update_email", targetUserId: target.uid, email, confirmed })}
          disabled={savingAction === "update_email" || email === target.email || !confirmed}
          className="min-h-11 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Save email
        </button>
        <button
          type="button"
          onClick={() => submit({ action: "create_password_reset_link", targetUserId: target.uid, confirmed })}
          disabled={savingAction === "create_password_reset_link" || !confirmed}
          className="min-h-11 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Create reset link
        </button>
        <button
          type="button"
          onClick={() => submit({ action: "set_temporary_password", targetUserId: target.uid, temporaryPassword, confirmed })}
          disabled={savingAction === "set_temporary_password" || temporaryPassword.length < 8 || !confirmed}
          className="min-h-11 rounded-full border border-brand-purple/40 bg-brand-purple/15 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Set temporary password
        </button>
        <button
          type="button"
          onClick={() => submit({ action: "update_role", targetUserId: target.uid, role, confirmed })}
          disabled={savingAction === "update_role" || role === target.role || !confirmed}
          className="min-h-11 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Save role
        </button>
        <button
          type="button"
          onClick={() => submit({ action: "update_status", targetUserId: target.uid, status, statusReason, confirmed })}
          disabled={savingAction === "update_status" || status === target.status || !confirmed}
          className="min-h-11 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Save status
        </button>
      </div>

      {resetLink ? (
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-sm text-zinc-200">
          <p className="font-semibold text-white">Reset link created</p>
          <p className="mt-1 break-all text-xs leading-5 text-zinc-400">{resetLink}</p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["inAppEnabled", "In-app notifications"],
            ["browserPushEnabled", "Browser push"],
            ["newDropAlerts", "New Drop alerts"],
            ["expiringSoonAlerts", "Ending soon alerts"],
          ].map(([key, label]) => (
            <label key={key} className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={notificationSettings[key as keyof NotificationSettings] === true}
                onChange={(event) => setNotificationSettings((current) => ({ ...current, [key]: event.target.checked }))}
                className="h-4 w-4 accent-brand-purple"
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={() => submit({ action: "update_notification_settings", targetUserId: target.uid, notificationSettings })}
          disabled={savingAction === "update_notification_settings"}
          className="mt-3 min-h-11 rounded-full bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
        >
          Save notifications
        </button>
      </div>

      <label className="space-y-2">
        <FieldLabel>Creator approval</FieldLabel>
        <select value={approvalStatus} onChange={(event) => setApprovalStatus(event.target.value as CreatorOnboardingApprovalStatus)} className={selectClass()}>
          {approvalOptions.map((option) => (
            <option key={option} value={option}>{formatCreatorApprovalStatus(option)}</option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => onApprovalStatusChange(approvalStatus)}
        disabled={savingAction === "account-approval-status" || approvalStatus === target.approvalStatus}
        className="min-h-11 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        Save approval
      </button>
    </div>
  );
}
