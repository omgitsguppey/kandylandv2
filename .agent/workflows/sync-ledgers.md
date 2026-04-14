// turbo-all
# Sync Codebase Ledgers & Audits Workflow

This workflow executes a 100% accurate synchronization of the current repository state against the three mandatory tracking ledgers (`FULL_SCALE_CODEBASE_AUDIT.md`, `REPO_MEMORY_LEDGER.md`, and `EVERY_FILE_FUNCTION_CHECKLIST.md`).

## Step 1: Establish the Baseline
1. Read the contents of all three ledger files carefully using the `view_file` tool to understand the current recorded state.
2. Auto-run `npm run check:inventory` and `npm run check:architecture` to gather the true, live state of the codebase.

## Step 2: Compare and Identify Discrepancies
1. Compare the live inventory output against `EVERY_FILE_FUNCTION_CHECKLIST.md`. 
2. Identify any newly created files that are missing from the checklist.
3. Identify any deleted files that are still mistakenly listed in the checklist.
4. Identify any "Last Modified" timestamps in the codebase that are newer than the timestamp recorded in the checklist.

## Step 3: Deep Function Trace
1. For every file identified as modified or missing in Step 2, run `npm run trace:adjacent -- <path>`.
2. Determine if the modification introduced new structural dependencies or patterns that should be recorded in `REPO_MEMORY_LEDGER.md`.

## Step 4: Surgical Ledger Updates
1. Using the `replace_file_content` tool, surgically append missing files to the correct sections of `EVERY_FILE_FUNCTION_CHECKLIST.md`. Check them as `[x]` if they are verified.
2. Remove deleted files from the checklists.
3. Update `FULL_SCALE_CODEBASE_AUDIT.md` replacing the `Last refreshed: [DATE]` string with today's date, and add a single, comprehensive entry at the top detailing exactly which files were synced during this automated sweep.

## Step 5: Final Report
1. Create an artifact titled `ledger_sync_report.md` summarizing exactly what was automatically fixed. 
2. Terminate the turn and present the report to the user.
