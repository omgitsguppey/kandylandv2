import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/creative-tim/ui/card";

interface SignedInLibraryHeaderProps {
  count: number;
  actions?: ReactNode;
}

export function SignedInLibraryHeader({ count, actions }: SignedInLibraryHeaderProps) {
  return (
    <Card className="relative overflow-hidden rounded-3xl border-white/10 bg-slate-950/80 py-0 text-white shadow-2xl shadow-black/20">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" aria-hidden="true" />
      <CardContent className="relative flex flex-col gap-5 px-5 py-6 sm:px-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-purple">Your collection</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">My KandyDrops</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {count === 1 ? "One Drop is ready to revisit." : `${count} Drops are ready to revisit.`}
          </p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </CardContent>
    </Card>
  );
}
