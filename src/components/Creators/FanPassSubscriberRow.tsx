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
      className="rounded-[1.5rem] border border-white/10 bg-black/20 p-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.18)] sm:p-4"
      data-fan-pass-crm-row="compact"
      data-subscriber-identity-source={subscriber.fanIdentitySource ?? "unavailable"}
      data-raw-user-id-hidden="true"
      data-creator-fan-pass-subscriber-status={status}
    >
      <div className="flex items-start gap-3">
        {subscriber.fanPhotoURL ? (
          <Image
            src={subscriber.fanPhotoURL}
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-2xl object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sm font-black text-white">
            {readInitial(fanLabel)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <MarqueeText
                as="h3"
                title={fanLabel}
                className="text-base font-black text-white"
                ariaLabel={fanLabel}
              />
              <p className="mt-0.5 truncate text-xs text-gray-400">{secondaryLabel}</p>
            </div>
            <span className={`shrink-0 rounded-xl border px-2.5 py-1.5 text-xs font-bold ${statusTone(status)}`}>
              {formatStatusLabel(status)}
            </span>
          </div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2">
        <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
          <dt className="text-xs font-bold uppercase tracking-wider text-gray-500">Fan Pass</dt>
          <dd className="mt-1 truncate text-xs font-bold text-white">{price}</dd>
        </div>
        <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
          <dt className="text-xs font-bold uppercase tracking-wider text-gray-500">Renewal</dt>
          <dd className="mt-1 truncate text-xs font-semibold text-gray-300">{renewal}</dd>
        </div>
        <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
          <dt className="text-xs font-bold uppercase tracking-wider text-gray-500">Plan</dt>
          <dd className="mt-1 truncate text-xs font-semibold text-gray-300">{autoRenew}</dd>
        </div>
      </dl>
    </article>
  );
}
