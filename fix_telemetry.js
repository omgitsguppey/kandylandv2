const fs = require('fs');

let code = fs.readFileSync('src/lib/telemetry.ts', 'utf-8');
code = code.replace(
/export function consumeTimedFlow\(flowKey: string, eventParams\?: Record<string, unknown>\) \{\n    const currentMap = readFlowMap\(\);\n    const entry = currentMap\[flowKey\];\n\n    if \(typeof window !== "undefined" && entry\) \{\n        delete currentMap\[flowKey\];\n        writeFlowMap\(currentMap\);\n    \}\n\n    const durationMs = entry \? Math\.max\(0, Date\.now\(\) - entry\.startedAt\) : undefined;\n    return \{\n        durationMs,\n        startedAt: entry\?\.startedAt,\n        mergedParams: \{\n            \.\.\.\(entry\?\.params \?\? \{\}\),\n            \.\.\.\(sanitizeEventParams\(eventParams\) \?\? \{\}\),\n            \.\.\.\(durationMs \? \{\n                duration_ms: durationMs,\n                duration_seconds: Math\.round\(durationMs \/ 1000\),\n            \} : \{\}\),\n        \},\n    \};\n\}/g,
`export function consumeTimedFlow(flowKey: string, eventParams?: Record<string, unknown>) {
    const currentMap = readFlowMap();
    const entry = currentMap[flowKey];

    if (typeof window !== "undefined" && entry) {
        delete currentMap[flowKey];
        writeFlowMap(currentMap);
    }

    const durationMs = entry ? Math.max(0, Date.now() - entry.startedAt) : undefined;
    const sanitizedParams = sanitizeEventParams(eventParams) ?? {};

    // Check if the sanitized params only have event_schema_version and no actual data
    const hasOnlySchemaVersion = Object.keys(sanitizedParams).length === 1 && 'event_schema_version' in sanitizedParams;
    const extraParams = hasOnlySchemaVersion ? {} : sanitizedParams;

    const hasStoredParams = entry?.params && Object.keys(entry.params).length > 0;
    const hasExtraParams = Object.keys(extraParams).length > 0;
    const hasDuration = durationMs !== undefined;

    let mergedParams = {};
    if (hasStoredParams || hasExtraParams || hasDuration) {
        mergedParams = {
            ...(entry?.params ?? {}),
            ...extraParams,
            ...(durationMs ? {
                duration_ms: durationMs,
                duration_seconds: Math.round(durationMs / 1000),
            } : {}),
        };
    }

    return {
        durationMs,
        startedAt: entry?.startedAt,
        mergedParams,
    };
}`
);

fs.writeFileSync('src/lib/telemetry.ts', code);
