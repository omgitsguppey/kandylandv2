import type { ReactNode } from "react";

type SignedInDashboardJourneyProps = {
  header: ReactNode;
  now: ReactNode;
  yourKandy: ReactNode;
  keepExploring: ReactNode;
};

export function SignedInDashboardJourney({ header, now, yourKandy, keepExploring }: SignedInDashboardJourneyProps) {
  return (
    <div className="min-w-0 space-y-10">
      {header}
      <div className="flex min-w-0 flex-wrap items-start gap-8">
        <div className="min-w-0 flex-[3_1_28rem]">{yourKandy}</div>
        <aside className="min-w-0 flex-[1_1_20rem]" aria-label="Daily rewards">{now}</aside>
      </div>
      <div className="flex min-w-0 flex-wrap items-start gap-8 [&>*]:min-w-0 [&>*]:flex-1 [&>*]:basis-80">
        {keepExploring}
      </div>
    </div>
  );
}
