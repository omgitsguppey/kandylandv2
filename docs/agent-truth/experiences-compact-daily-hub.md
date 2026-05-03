# Experiences Compact Daily Hub

Status: Active public beta layout doctrine
Last updated: 2026-05-02

The `/experiences` route is the retention/action hub. It should start with a compact `Daily Experiences / Stay ready to unwrap` intro, then move quickly into Creator Spotlight, DailyCheckIn, DailyTasksModule, Live Drops For You, and the GumDrops wallet CTA.

The Experiences hero must not render redundant explainer cards such as `Daily reset` or `Reward loop`. Keep the rounded panel and concise title/subtitle, but avoid tall education blocks that duplicate the check-in and task modules immediately below.

DailyCheckIn has two allowed presentation variants. Dashboard uses the full account-status version with welcome header and subtitle. Experiences uses the compact retention-hub version that hides the welcome header/subtitle and tightens vertical rhythm. Logic, reward ladder, check-in state, confetti, and telemetry remain shared.

Dashboard owns the full DailyCheckIn account-status presentation. Do not remove `Welcome back to the Kandy Shop` or `Claim your streak and stay ready to unwrap` from the Dashboard path. Experiences may hide those lines only by passing the shared `experiences` variant.

The Experiences route uses the normal public mobile shell reservation. Do not add page-local safe-area padding, negative margins, transforms, `100vh`, or extra fixed spacers to make the bottom content clear the mobile bottom nav. Browser and standalone PWA modes must share the same component tree.

Validation owner: `npm run check:experiences-compact-layout`.
