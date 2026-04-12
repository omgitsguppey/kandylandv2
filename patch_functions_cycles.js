const fs = require('fs');
let code = fs.readFileSync('scripts/check-cycles.ts', 'utf-8');
code = code.replace(
/functions: {\n    label: "functions",\n    input: "functions\/src",\n    tsConfig: "functions\/tsconfig\.json",\n    extensions: \["ts"\],\n  },/,
`functions: {
    label: "functions",
    input: "functions/src",
    tsConfig: "functions/tsconfig.json",
    extensions: ["ts"],
    excludeRegExp: [
      "^firebase-functions/v2/firestore$",
      "^firebase-functions/v2/scheduler$",
      "^firebase-functions/logger$",
      "^firebase-functions/v2$"
    ],
    allowedSkipped: [
      "firebase-functions/v2/firestore",
      "firebase-functions/v2/scheduler",
      "firebase-functions/logger",
      "firebase-functions/v2"
    ],
  },`
);
fs.writeFileSync('scripts/check-cycles.ts', code);
