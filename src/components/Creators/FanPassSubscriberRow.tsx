"use client";

import Image from "next/image";

import { MarqueeText } from "@/components/ui/MarqueeText";

type FanIdentitySource = "user_profile" | "public_profile" | "subscription_snapshot" | "unavailable" | string;

export type FanPassSubscriberCrmRow = {
  id: string;
  subscriberId?: string;
  status?: string;
  priceGd?: number;
  startedAt?: number;
  renewAt?: number;
  renewedAt?: number;
  gracePeriodEndsAt?: number | null;
  renewalState?: string;
  autoRenew?: boolean;
  fanUsername?: string;
  fanDisplayName?: string;
  fanPhotoURL?: string | null;
  fanHandle?: string;
  fanLabel?: string;
  maskedFanId?: string;
  fanIdentitySource?: FanIdentitySource;
};

function statusTone(status: string | undefined) {
  switch (status) {
    case "active":
      return "border-emerald-300/20 bg-emerald-500/10 text-emerald-100";
    case "grace":
    case "past_due":
      return "border-amber-300/20 bg-amber-500/10 text-amber-100";
    case "canceled":
      return "border-red-300/20 bg-red-500/10 text-red-100";
    default:
      return "border-white/10 bg-white/5 text-gray-200";
  }
}

function formatDate(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Renewal unavailable";
  }
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatStatusLabel(value?: string) {
  return value ? value.replaceAll("_", " ") : "unknown";
}

function readInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "F";
}

export function FanPassSubscriberRow({
  subscriber,
  fallbackPriceGd,
}: {
  subscriber: FanPassSubscriberCrmRow;
  fallbackPriceGd?: number;
}) {
  const status = subscriber.status || "unknown";
  const fanLabel = subscriber.fanLabel || subscriber.fanHandle || subscriber.fanDisplayName || "Fan";
  const secondaryLabel = subscriber.fanIdentitySource === "unavailable"
    ? "Identity unavailable"
    : subscriber.fanDisplayName && subscriber.fanDisplayName !== fanLabel
      ? subscriber.fanDisplayName
      : subscriber.fanHandle || subscriber.maskedFanId || "Fan Pass subscriber";
  const price = typeof subscriber.priceGd === "number"
    ? `${subscriber.priceGd.toLocaleString()} GD`
    : typeof fallbackPriceGd === "number"
      ? `${fallbackPriceGd.toLocaleString()} GD`
      : "Price unavailable";
  const renewal = typeof subscriber.renewAt === "number"
    ? `Renews ${formatDate(subscriber.renewAt)}`
    : typeof subscriber.startedAt === "number"
      ? `Started ${formatDate(subscriber.startedAt)}`
      : "Renewal unavailable";
  const autoRenew = subscriber.autoRenew === false ? "Auto-renew off" : "Auto-renew on";

  return (
    <article
      className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
      data-fan-pass-crm-row="compact"
      data-subscriber-identity-source={subscriber.fanIdentitySource ?? "unavailable"}
      data-raw-user-id-hidden="true"
      data-creator-fan-pass-subscriber-status={status}
    >
      <div className="flex items-center gap-3">
        {subscriber.fanPhotoURL ? (
          <Image
            src={subscriber.fanPhotoURL}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xs font-black text-white">
            {readInitial(fanLabel)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <MarqueeText
                as="h3"
                title={fanLabel}
                className="text-sm font-bold text-white"
                ariaLabel={fanLabel}
              />
              <p className="truncate text-[11px] text-gray-400">{secondaryLabel}</p>
            </div>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${statusTone(status)}`}>
              {formatStatusLabel(status)}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-gray-300">
            {price} | {renewal} | {autoRenew}
          </p>
        </div>
      </div>
    </article>
  );
}
