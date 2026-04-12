const fs = require('fs');

const codeToAdd = `
export type ChatRealtimeRefreshPlanInput = {
    degradedScopes: string[];
    hasSelectedThread: boolean;
};

export function getChatRealtimeRefreshPlan({
    degradedScopes,
    hasSelectedThread,
}: ChatRealtimeRefreshPlanInput) {
    return {
        refreshThreads: degradedScopes.includes("threads") || degradedScopes.includes("all"),
        refreshSelectedThreadDetail: hasSelectedThread && (degradedScopes.includes("selectedThread") || degradedScopes.includes("all")),
    };
}
`;

let code = fs.readFileSync('src/lib/chat-realtime.ts', 'utf-8');
code = code + codeToAdd;
fs.writeFileSync('src/lib/chat-realtime.ts', code);
