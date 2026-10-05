"use client";

import { Badge } from "@/components/ui/badge";

import { GroupedRow } from "@/components/ui/content-layout";

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
      return "border-success/20 bg-success/10 text-success";
    case "grace":
    case "past_due":
      return "border-warning/20 bg-warning/10 text-warning";
    case "canceled":
      return "border-destructive/20 bg-destructive/10 text-destructive";
    default:
      return "border-border bg-secondary text-foreground";
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
    <GroupedRow
      className="block"
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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-sm font-semibold text-foreground">
            {readInitial(fanLabel)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <MarqueeText
                as="h3"
                title={fanLabel}
                className="text-base font-semibold text-foreground"
                ariaLabel={fanLabel}
              />
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{secondaryLabel}</p>
            </div>
            <Badge variant="secondary" className={`shrink-0 rounded-xl border px-2.5 py-1.5 text-xs font-semibold ${statusTone(status)}`}>
              {formatStatusLabel(status)}
            </Badge>
          </div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2">
        <div className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fan Pass</dt>
          <dd className="mt-1 truncate text-xs font-semibold text-foreground">{price}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Renewal</dt>
          <dd className="mt-1 truncate text-xs font-semibold text-muted-foreground">{renewal}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plan</dt>
          <dd className="mt-1 truncate text-xs font-semibold text-muted-foreground">{autoRenew}</dd>
        </div>
      </dl>
    </GroupedRow>
  );
}
