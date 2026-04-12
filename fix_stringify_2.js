const fs = require('fs');

let code = fs.readFileSync('src/lib/server/route-diagnostics.ts', 'utf-8');
code = code.replace(
/    try \{\n        const stringified = JSON\.stringify\(value\);\n        if \(typeof stringified === 'string'\) \{\n             return \[key, stringified\.slice\(0, 500\)\] as const;\n        \}\n    \} catch \(e\) \{\n        \/\/ Fallback for non-serializable objects\n    \}\n    return \[key, String\(value\)\.slice\(0, 500\)\] as const;/g,
`    try {
        const stringified = JSON.stringify(value);
        if (typeof stringified === 'string') {
             return [key, stringified.slice(0, 500)] as const;
        }
    } catch (e) {
        // Fallback for non-serializable objects
    }
    const valString = (value !== undefined && value !== null) ? String(value) : "";
    return [key, valString.slice(0, 500)] as const;`
);

fs.writeFileSync('src/lib/server/route-diagnostics.ts', code);
