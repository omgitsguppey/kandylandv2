const fs = require('fs');

let code = fs.readFileSync('src/hooks/useChatUnreadStatus.ts', 'utf-8');
code = code.replace(
/fallbackMessage: buildFirestoreClientFallbackMessage\("Chat unread badge", error\) \+ " A polling fallback is active\.",/g,
`fallbackMessage: buildFirestoreClientFallbackMessage("Chat unread badge", error),`
);
fs.writeFileSync('src/hooks/useChatUnreadStatus.ts', code);

let errCode = fs.readFileSync('src/lib/firestore-client-errors.ts', 'utf-8');
errCode = errCode.replace(
/return `\$\{scopeOrFeature\} live updates hit a Firestore client state failure\. Realtime may be momentarily interrupted\.`;/,
"return `${scopeOrFeature} live updates hit a Firestore client state failure. Realtime may be momentarily interrupted. A polling fallback is active.`;"
);
fs.writeFileSync('src/lib/firestore-client-errors.ts', errCode);
