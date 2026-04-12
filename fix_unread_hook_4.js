const fs = require('fs');

let errCode = fs.readFileSync('src/lib/firestore-client-errors.ts', 'utf-8');
errCode = errCode.replace(
/return \`\$\{scope\} live updates hit a Firestore client state failure\. Realtime may be momentarily interrupted\.\`;/,
"return `${scope} live updates hit a Firestore client state failure. Realtime may be momentarily interrupted. A polling fallback is active.`;"
);
fs.writeFileSync('src/lib/firestore-client-errors.ts', errCode);
