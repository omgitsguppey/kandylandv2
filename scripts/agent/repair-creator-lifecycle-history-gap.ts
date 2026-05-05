import { repairCreatorLifecycleHistoryGap } from "../../src/lib/server/creator-onboarding";

type Args = {
  userId: string;
  event: "id_requested";
  sourceOnboardingUpdatedAt?: number;
  apply: boolean;
};

function readArgValue(args: string[], name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function parseArgs(args: string[]): Args {
  const userId = readArgValue(args, "--userId")?.trim() ?? "";
  const event = readArgValue(args, "--event")?.trim() ?? "";
  const sourceOnboardingUpdatedAtRaw = readArgValue(args, "--sourceOnboardingUpdatedAt");
  const sourceOnboardingUpdatedAt = Number(sourceOnboardingUpdatedAtRaw);

  if (!userId) {
    throw new Error("Missing --userId.");
  }
  if (event !== "id_requested") {
    throw new Error("Only --event id_requested is supported by this narrow Creator Lane repair command.");
  }

  return {
    userId,
    event,
    sourceOnboardingUpdatedAt: Number.isFinite(sourceOnboardingUpdatedAt) && sourceOnboardingUpdatedAt > 0
      ? Math.trunc(sourceOnboardingUpdatedAt)
      : undefined,
    apply: args.includes("--apply"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await repairCreatorLifecycleHistoryGap({
    userId: args.userId,
    missingHistoryEvent: args.event,
    sourceOnboardingUpdatedAt: args.sourceOnboardingUpdatedAt,
    dryRun: !args.apply,
  });

  console.log(JSON.stringify({
    ...result,
    commandMode: args.apply ? "applied" : "dry_run",
    guidance: args.apply
      ? "Provenance-marked history repair completed without changing creator approval, role, legal, ID, queue, settings, or projection state."
      : "Dry run only. Re-run with --apply after verifying Debug source evidence. The repair does not change creator approval, role, legal, ID, queue, settings, or projection state.",
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
