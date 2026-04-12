const fs = require('fs');
let code = fs.readFileSync('src/hooks/useChatUnreadStatus.ts', 'utf-8');

code = code.replace(
/import \{ reportRealtimeIssue \} from "@\/lib\/client-error-reporting";/,
`import { reportRealtimeIssue } from "@/lib/client-error-reporting";\nimport { authFetch } from "@/lib/authFetch";`
);

code = code.replace(
/        if \(\!preferRealtime\) \{\n            realtimeRetryAttemptRef\.current = 0;\n            realtimeIssueReportedAtRef\.current = null;\n            if \(realtimeRetryTimerRef\.current\) \{\n                window\.clearTimeout\(realtimeRetryTimerRef\.current\);\n                realtimeRetryTimerRef\.current = null;\n            \}\n            return;\n        \}\n\n        const viewerField = viewerRole === "creator" \? "creatorId" : "userId";\n        const scheduleRetry = \(\) => \{/g,
`        const pollFallback = () => {
            void authFetch("/api/chat/threads").then((res) => {
                if (res.ok) {
                    res.json().then((data) => {
                         let unreadCount = 0;
                         if (Array.isArray(data?.threads)) {
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

        const viewerField = viewerRole === "creator" ? "creatorId" : "userId";
        const scheduleRetry = () => {`
);

code = code.replace(
/                            fallbackMessage: buildFirestoreClientFallbackMessage\("Chat unread badge", error\),\n                            retryDelayMs,\n                        \}\),\n                    \}\);\n                \}\n            \},/g,
`                            fallbackMessage: buildFirestoreClientFallbackMessage("Chat unread badge", error) + " A polling fallback is active.",
                            retryDelayMs,
                        }),
                    });
                }
                pollFallback();
            },`
);


fs.writeFileSync('src/hooks/useChatUnreadStatus.ts', code);
