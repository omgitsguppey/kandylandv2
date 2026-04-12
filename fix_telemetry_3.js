const fs = require('fs');

let code = fs.readFileSync('src/lib/telemetry.ts', 'utf-8');
code = code.replace(
/function sanitizeEventParams\(eventParams\?: Record<string, unknown>\) \{\n    return sanitizeTelemetryParamsForBackend\(eventParams\);\n\}/,
`function sanitizeEventParams(eventParams?: Record<string, unknown>) {
    const backendParams = sanitizeTelemetryParamsForBackend(eventParams);
    // Don't inject event_schema_version for internal flow state,
    // only attach it when sending the final payload
    if (Object.keys(backendParams).length === 1 && backendParams.event_schema_version === "v2") {
        return undefined;
    }
    const { event_schema_version, ...rest } = backendParams;
    return Object.keys(rest).length > 0 ? rest : undefined;
}`
);

fs.writeFileSync('src/lib/telemetry.ts', code);
