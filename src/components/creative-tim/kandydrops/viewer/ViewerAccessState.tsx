import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

interface ViewerAccessStateProps {
  eyebrow: string;
  icon: ReactNode;
  title: string;
  message: string;
  children?: ReactNode;
}

export function ViewerAccessState({ eyebrow, icon, title, message, children }: ViewerAccessStateProps) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-slate-950 px-4 py-12 text-white">
      <div className="pointer-events-none absolute h-72 w-72 rounded-full bg-brand-purple/20 blur-3xl" aria-hidden="true" />
      <Card className="relative w-full max-w-lg rounded-3xl border-white/10 bg-slate-950/85 py-0 text-center shadow-2xl shadow-black/30">
        <CardContent className="px-6 py-8 sm:px-10 sm:py-10">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-purple/30 bg-brand-purple/10 text-brand-purple">
            {icon}
          </div>
          <p className="text-sm font-semibold text-brand-purple">{eyebrow}</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">{message}</p>
          {children ? <div className="mt-7 flex flex-wrap items-center justify-center gap-3">{children}</div> : null}
        </CardContent>
      </Card>
    </main>
  );
}
