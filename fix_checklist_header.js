const fs = require('fs');

let code = fs.readFileSync('EVERY_FILE_FUNCTION_CHECKLIST.md', 'utf-8');

code = code.replace(
/Current tracked baseline in the standing audit: 687 tracked files after the 2026-04-07 AI drop-cover catalog audit pass/g,
'Current tracked baseline in the standing audit: 799 tracked files after the 2026-04-12 codebase hygiene refresh'
);

fs.writeFileSync('EVERY_FILE_FUNCTION_CHECKLIST.md', code);

let ledgerCode = fs.readFileSync('REPO_MEMORY_LEDGER.md', 'utf-8');
// Check if ledger needs minor date update
ledgerCode = ledgerCode.replace(
/- Total tracked files: `\d+`/g,
'- Total tracked files: `799`'
);
fs.writeFileSync('REPO_MEMORY_LEDGER.md', ledgerCode);
