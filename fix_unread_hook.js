const fs = require('fs');

const codeToReplace = `
        if (!preferRealtime) {
            realtimeRetryAttemptRef.current = 0;
            realtimeIssueReportedAtRef.current = null;
            if (realtimeRetryTimerRef.current) {
                window.clearTimeout(realtimeRetryTimerRef.current);
                realtimeRetryTimerRef.current = null;
            }
            return;
        }

        const viewerField = viewerRole === "creator" ? "creatorId" : "userId";
`;

const replacementCode = `
        const viewerField = viewerRole === "creator" ? "creatorId" : "userId";

        const scheduleRetry = () => {
            if (realtimeRetryTimerRef.current) {
                return getChatRealtimeRetryDelayMs(realtimeRetryAttemptRef.current || 1);
            }

            realtimeRetryAttemptRef.current += 1;
            const retryDelayMs = getChatRealtimeRetryDelayMs(realtimeRetryAttemptRef.current);
            realtimeRetryTimerRef.current = window.setTimeout(() => {
                realtimeRetryTimerRef.current = null;
                setRealtimeRetryEpoch((current) => current + 1);
            }, retryDelayMs);
            return retryDelayMs;
        };

        const pollFallback = () => {
            authFetch("/api/chat/threads").then((res) => {
                if (res.ok) {
                    res.json().then((data) => {
                         let unreadCount = 0;
                         if (Array.isArray(data.threads)) {
                             for (const thread of data.threads) {
                                  const role = thread.creatorId === user.uid ? "creator" : "user";
                                  unreadCount += resolveChatThreadUnreadCount(thread, role);
                             }
                         }
                         setHasUnreadMessages(unreadCount > 0);
                    }).catch(() => {});
                }
            }).catch(() => {});
        };

        if (!preferRealtime) {
            realtimeRetryAttemptRef.current = 0;
            realtimeIssueReportedAtRef.current = null;
            if (realtimeRetryTimerRef.current) {
                window.clearTimeout(realtimeRetryTimerRef.current);
                realtimeRetryTimerRef.current = null;
            }
            pollFallback();
            return;
        }
`;

let code = fs.readFileSync('src/hooks/useChatUnreadStatus.ts', 'utf-8');

// Also add import for authFetch
code = code.replace(
/import \{ reportRealtimeIssue \} from "@\/lib\/client-error-reporting";/,
`import { reportRealtimeIssue } from "@/lib/client-error-reporting";\nimport { authFetch } from "@/lib/authFetch";`
);

// We'll use a more surgical replace using AST or regex based on file state
