const fs = require('fs');

let code = fs.readFileSync('tests/unit/telemetry-flows.spec.ts', 'utf-8');
code = code.replace(
/            expect\(result\.mergedParams\.duration_ms\)\.toBeUndefined\(\);\n            expect\(result\.mergedParams\.duration_seconds\)\.toBeUndefined\(\);/g,
`            expect((result.mergedParams as any).duration_ms).toBeUndefined();
            expect((result.mergedParams as any).duration_seconds).toBeUndefined();`
);
fs.writeFileSync('tests/unit/telemetry-flows.spec.ts', code);
