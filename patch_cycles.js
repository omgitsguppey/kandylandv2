const fs = require('fs');
let code = fs.readFileSync('scripts/check-cycles.ts', 'utf-8');
code = code.replace(
  /"@tanstack\/react-query",/g,
  '"@tanstack/react-query",\n      "@axe-core/react",'
);
code = code.replace(
  /"\^@tanstack\/react-query\$",/g,
  '"^@tanstack/react-query$",\n      "^@axe-core/react$",'
);
fs.writeFileSync('scripts/check-cycles.ts', code);
