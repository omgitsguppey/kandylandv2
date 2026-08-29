import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function KandyLegalDocument({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className="relative isolate min-h-screen overflow-hidden bg-[#08040f] px-4 py-8 text-white sm:px-6 sm:py-12"
      style={{ paddingTop: "calc(2.5rem + var(--kandy-cookie-offset, 0px))" }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_12%_0%,rgba(255,111,207,0.17),transparent_25rem),radial-gradient(circle_at_84%_10%,rgba(178,140,255,0.23),transparent_30rem)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:2.75rem_2.75rem] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
      <article
        className={cn(
          "relative mx-auto w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(20,10,31,0.94),rgba(8,4,15,0.98))] shadow-[0_30px_90px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)]",
          className
        )}
      >
        {children}
      </article>
    </main>
  );
}

export function KandyLegalHero({
  eyebrow,
  title,
  updatedLabel,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  title: string;
  updatedLabel: string;
  icon: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden border-b border-white/10 px-5 py-6 sm:px-8 sm:py-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-brand-purple/20 blur-3xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-purple/30 bg-brand-purple/15 text-brand-purple">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">{eyebrow}</p>
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl">{title}</h1>
        </div>
        <span className="w-fit rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-bold text-white/60">
          {updatedLabel}
        </span>
      </div>
      {children ? <div className="relative mt-5">{children}</div> : null}
    </header>
  );
}

export function KandyLegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="relative border-b border-white/10 px-5 py-6 last:border-b-0 sm:px-8 sm:py-8">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-pink shadow-[0_0_18px_rgba(255,111,207,0.85)]" />
        <h2 className="text-lg font-black tracking-tight text-white">{title}</h2>
      </div>
      <div className="mt-4 space-y-3 text-sm leading-7 text-white/68 [&_a]:font-semibold [&_a]:text-brand-purple [&_a]:underline-offset-4 [&_a:hover]:underline [&_strong]:font-bold [&_strong]:text-white">
        {children}
      </div>
    </section>
  );
}