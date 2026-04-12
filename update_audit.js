const fs = require('fs');
let audit = fs.readFileSync('FULL_SCALE_CODEBASE_AUDIT.md', 'utf-8');

audit = audit.replace(
/- Total tracked files: `\d+`/g,
'- Total tracked files: `799`'
);
audit = audit.replace(
/- Root files: `\d+`/g,
'- Root files: `55`'
);
audit = audit.replace(
/- Root markdown\/docs: `\d+`/g,
'- Root markdown/docs: `17`'
);
audit = audit.replace(
/- Root lockfiles: `\d+`/g,
'- Root lockfiles: `1`'
);
audit = audit.replace(
/- Root config\/runtime\/tooling files: `\d+`/g,
'- Root config/runtime/tooling files: `37`'
);
audit = audit.replace(
/- src: `\d+`/g,
'- src: `452`'
);
audit = audit.replace(
/- src\/app: `\d+`/g,
'- src/app: `157`'
);
audit = audit.replace(
/- src\/components: `\d+`/g,
'- src/components: `83`'
);
audit = audit.replace(
/- src\/context: `\d+`/g,
'- src/context: `4`'
);
audit = audit.replace(
/- src\/hooks: `\d+`/g,
'- src/hooks: `15`'
);
audit = audit.replace(
/- src\/lib: `\d+`/g,
'- src/lib: `169`'
);
audit = audit.replace(
/- src\/lib\/server: `\d+`/g,
'- src/lib/server: `70`'
);
audit = audit.replace(
/- src\/types: `\d+`/g,
'- src/types: `4`'
);
audit = audit.replace(
/- functions: `\d+`/g,
'- functions: `37`'
);
audit = audit.replace(
/- functions\/src: `\d+`/g,
'- functions/src: `30`\n- scripts: `20`\n- tests: `160`\n- public: `11`\n- dataconnect: `14`\n- src/dataconnect-generated: `15`\n- src/dataconnect-admin-generated: `5`\n- functions/src/dataconnect-admin-generated: `5`'
);
audit = audit.replace(/Verified by `npm run check:inventory` on \d{4}-\d{2}-\d{2}:/g, 'Verified by `npm run check:inventory` on 2026-04-12:');

fs.writeFileSync('FULL_SCALE_CODEBASE_AUDIT.md', audit);
