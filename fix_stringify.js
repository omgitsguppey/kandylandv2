const fs = require('fs');

let code = fs.readFileSync('src/lib/server/route-diagnostics.ts', 'utf-8');
code = code.replace(
/    return \[key, JSON\.stringify\(value\)\.slice\(0, 500\)\] as const;/g,
`    try {
        const stringified = JSON.stringify(value);
        if (typeof stringified === 'string') {
             return [key, stringified.slice(0, 500)] as const;
        }
    } catch (e) {
        // Fallback for non-serializable objects
    }
    return [key, String(value).slice(0, 500)] as const;`
);

fs.writeFileSync('src/lib/server/route-diagnostics.ts', code);
