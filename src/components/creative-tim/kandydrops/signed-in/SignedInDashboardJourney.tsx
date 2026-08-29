import type { ReactNode } from "react";

type SignedInDashboardJourneyProps = {
  header: ReactNode;
  now: ReactNode;
  yourKandy: ReactNode;
  keepExploring: ReactNode;
};

function JourneyChapter({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="relative" aria-labelledby={`dashboard-${eyebrow.toLowerCase().replaceAll(" ", "-")}`}>
      <header className="mb-4 flex items-end justify-between gap-4 px-1 sm:mb-5 sm:px-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-pink">{eyebrow}</p>
          <h2 id={`dashboard-${eyebrow.toLowerCase().replaceAll(" ", "-")}`} className="mt-1 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">
            {title}
          </h2>
        </div>
      </header>
      {children}
    </section>
  );
}

export function SignedInDashboardJourney({
  header,
  now,
  yourKandy,
  keepExploring,
}: SignedInDashboardJourneyProps) {
  return (
    <div className="relative space-y-10 sm:space-y-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-28 -z-10 h-80 bg-[radial-gradient(circle_at_18%_0%,rgba(255,111,207,0.16),transparent_32%),radial-gradient(circle_at_82%_16%,rgba(178,140,255,0.18),transparent_34%)]" />
      {header}

      <JourneyChapter eyebrow="Now" title="Your daily moment">
        <div className="max-w-2xl">{now}</div>
      </JourneyChapter>

      <JourneyChapter eyebrow="Your Kandy" title="The Drops waiting for you">
        {yourKandy}
      </JourneyChapter>

      <JourneyChapter eyebrow="Keep exploring" title="More ways into KandyDrops">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)]">{keepExploring}</div>
      </JourneyChapter>
    </div>
  );
}
