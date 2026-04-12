const fs = require('fs');

let hook = fs.readFileSync('src/hooks/useChatUnreadStatus.ts', 'utf-8');
hook = hook.replace(
/    useEffect\(\(\) => \{\n        if \(\!user \|\| \!userProfile\) \{\n            setHasUnreadMessages\(false\);\n            realtimeRetryAttemptRef\.current = 0;\n            realtimeIssueReportedAtRef\.current = null;\n/,
`    useEffect(() => {
        if (!user || !userProfile) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setHasUnreadMessages(false);
            realtimeRetryAttemptRef.current = 0;
            realtimeIssueReportedAtRef.current = null;
`
);

fs.writeFileSync('src/hooks/useChatUnreadStatus.ts', hook);
