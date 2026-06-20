// turbo-all
# Sync Codebase Ledgers & Audits Workflow

This workflow is an explicit governance/ledger maintenance lane. Do not run it for ordinary source fixes, UI cleanup, validator passes, or external-audit intake unless the task specifically asks to synchronize ledgers, changes doctrine/governance, promotes or retires an owner/validator lane, changes verification policy, or an owning validator requires durable memory writeback.

The canonical startup path is compact-first: use the generated task context, verification plan, surface map, and relevant doctrine cards before opening large ledgers. The large ledgers (`FULL_SCALE_CODEBASE_AUDIT.md`, `REPO_MEMORY_LEDGER.md`, and `EVERY_FILE_FUNCTION_CHECKLIST.md`) are escalation evidence, not a mandatory proof ritual for every task.

## Step 1: Establish The Baseline
1. Confirm this is a real ledger-sync task, not a normal source fix.
2. Run `git status --short`.
3. Read only the relevant recent ledger sections first. Read the full ledgers only when the discrepancy spans broad governance, inventory, architecture, or source ownership.
4. Run `npm run check:inventory` and `npm run check:architecture` only when the sync needs current repo-wide inventory or architecture evidence.

## Step 2: Compare And Identify Discrepancies
1. Compare the live inventory output against `EVERY_FILE_FUNCTION_CHECKLIST.md`. 
2. Identify any newly created files that are missing from the checklist.
3. Identify any deleted files that are still mistakenly listed in the checklist.
4. Identify any "Last Modified" timestamps in the codebase that are newer than the timestamp recorded in the checklist.

## Step 3: Deep Function Trace
1. For files with ownership or dependency uncertainty, run `npm run trace:adjacent -- <path>`.
2. Determine if the modification introduced durable structural dependencies or patterns that should be recorded in `REPO_MEMORY_LEDGER.md`.
3. Do not write memory for ordinary focused source fixes when the source diff, targeted tests, commit message, or compact report already carries the evidence.

## Step 4: Surgical Ledger Updates
1. Surgically append missing files to the correct sections of `EVERY_FILE_FUNCTION_CHECKLIST.md`. Check them as `[x]` only if they are verified.
2. Remove deleted files from the checklists.
3. Update `FULL_SCALE_CODEBASE_AUDIT.md` only when the pass changes doctrine/governance, broad inventory, owner promotion/retirement, or verification policy. Do not add a broad audit entry just to prove an ordinary source fix happened.

## Step 5: Final Report
1. Summarize which ledger entries were changed, why durable memory writeback was necessary, and which source evidence supports the update.
2. If no durable memory writeback was necessary, say that directly and leave the ledgers untouched.
