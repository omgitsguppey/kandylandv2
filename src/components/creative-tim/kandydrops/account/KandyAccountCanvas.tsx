"use client";

import { useState, type ReactNode } from "react";

const ACCOUNT_SPACES = [
  { id: "identity", label: "Identity", description: "Profile and sign-in details" },
  { id: "preferences", label: "Preferences", description: "Notifications and privacy choices" },
  { id: "care", label: "Care & safety", description: "Data, support, and safety controls" },
] as const;

type AccountSpaceId = (typeof ACCOUNT_SPACES)[number]["id"];

export function KandyAccountCanvas({ children }: { children: ReactNode }) {
  const [activeSpace, setActiveSpace] = useState<AccountSpaceId>("identity");
  const active = ACCOUNT_SPACES.find((space) => space.id === activeSpace) ?? ACCOUNT_SPACES[0];

  return (
    <section className="relative overflow-hidden border-y border-white/10 py-5 sm:py-6" data-account-canvas-active-space={active.id}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 top-0 h-44 w-44 rounded-full bg-brand-pink/10 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-pink">Your account spaces</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{active.label}</h2>
          <p className="mt-2 text-sm leading-6 text-white/60">{active.description}</p>
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-black/20 p-1" role="group" aria-label="Choose an account space">
          {ACCOUNT_SPACES.map((space) => {
            const selected = space.id === active.id;
            return (
              <button
                key={space.id}
                type="button"
                onClick={() => setActiveSpace(space.id)}
                aria-pressed={selected}
                className={`min-h-11 rounded-xl px-3 text-sm font-bold transition ${selected ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/20" : "text-white/60 hover:bg-white/10 hover:text-white"}`}
              >
                {space.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative mt-6">{children}</div>
    </section>
  );
}
