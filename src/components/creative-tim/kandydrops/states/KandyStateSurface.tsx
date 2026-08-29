import type { ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

import { Card } from "@/components/creative-tim/ui/card";
import { cn } from "@/lib/utils";

type StateTone = "violet" | "critical";

const stateToneStyles: Record<StateTone, {
  halo: string;
  icon: string;
  eyebrow: string;
}> = {
  violet: {
    halo: "bg-[radial-gradient(circle_at_18%_4%,rgba(255,111,207,0.26),transparent_23rem),radial-gradient(circle_at_82%_10%,rgba(178,140,255,0.3),transparent_29rem)]",
    icon: "border-brand-purple/35 bg-brand-purple/15 text-brand-purple shadow-[0_0_34px_rgba(178,140,255,0.2)]",
    eyebrow: "text-brand-pink",
  },
  critical: {
    halo: "bg-[radial-gradient(circle_at_18%_4%,rgba(255,111,207,0.15),transparent_23rem),radial-gradient(circle_at_82%_10%,rgba(239,68,68,0.22),transparent_29rem)]",
    icon: "border-red-300/30 bg-red-500/10 text-red-200 shadow-[0_0_34px_rgba(239,68,68,0.16)]",
    eyebrow: "text-red-200",
  },
};

type KandyStateSurfaceProps = {
  tone: StateTone;
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  children?: ReactNode;
  footer?: ReactNode;
};

export function KandyStateSurface({
  tone,
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
  footer,
}: KandyStateSurfaceProps) {
  const styles = stateToneStyles[tone];

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#08040f] px-4 py-10 text-white sm:px-6">
      <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", styles.halo)} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:2.75rem_2.75rem] [mask-image:radial-gradient(circle_at_center,black,transparent_78%)]" />

      <div className="relative w-full max-w-xl">
        <Card className="!gap-0 !overflow-hidden !rounded-[2rem] !border-white/10 !bg-[linear-gradient(145deg,rgba(255,255,255,0.105),rgba(255,255,255,0.035)_45%,rgba(178,140,255,0.08))] !p-0 text-center shadow-[0_32px_100px_rgba(0,0,0,0.42)] backdrop-blur-xl">
          <div className="border-b border-white/10 px-6 pb-5 pt-7 sm:px-9 sm:pt-9">
            <div className={cn("mx-auto flex h-16 w-16 items-center justify-center rounded-[1.45rem] border", styles.icon)}>
              <Icon className="h-8 w-8" aria-hidden="true" />
            </div>
            <p className={cn("mt-5 text-[10px] font-black uppercase tracking-[0.22em]", styles.eyebrow)}>{eyebrow}</p>
            <h1 id="state-page-title" className="mt-2 text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl">
              {title}
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-white/68 sm:text-base">
              {description}
            </p>
          </div>

          {children ? <div className="px-6 py-5 sm:px-9 sm:py-6">{children}</div> : null}
        </Card>

        {footer ? <div className="mt-5 text-center text-xs font-semibold tracking-wide text-white/35">{footer}</div> : null}
      </div>
    </main>
  );
}
