const fs = require('fs');

let config = fs.readFileSync('eslint.config.mjs', 'utf-8');
config = config.replace(
/            "import\/no-unresolved": \["error", \{ ignore: \["\^@\/"\] \}\],/,
`            "import/no-unresolved": ["error", { ignore: ["^@/", "^firebase-functions/", "^@axe-core/react"] }],`
);
fs.writeFileSync('eslint.config.mjs', config);
