/** @type {import("dependency-cruiser").IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-app-runtime-imports-from-functions",
      severity: "error",
      comment: "Firebase Functions should not depend on the Next app runtime.",
      from: { path: "^functions/src/" },
      to: { path: "^src/(app|components|context|hooks)/" },
    },
    {
      name: "no-client-imports-from-server-lib",
      severity: "error",
      comment: "Client components, hooks, and providers must not import server-only helpers.",
      from: { path: "^src/(components|context|hooks)/" },
      to: { path: "^src/lib/server/" },
    },
    {
      name: "no-server-imports-from-client-runtime",
      severity: "error",
      comment: "Server routes/helpers should not depend on client runtime modules.",
      from: { path: "^src/(app/api|lib/server)/" },
      to: { path: "^src/(components|context|hooks)/" },
    },
    {
      name: "no-cross-runtime-imports-into-functions",
      severity: "error",
      comment: "Functions code should stay decoupled from Next.js application files.",
      from: { path: "^src/" },
      to: { path: "^functions/src/" },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    exclude: {
      path: [
        "^\\.next/",
        "^output/",
        "^public/",
        "^tests/visual\\.spec\\.ts-snapshots/",
        "dataconnect-generated",
        "dataconnect-admin-generated",
        "\\.d\\.ts$",
      ].join("|"),
    },
    includeOnly: "^(src|functions/src|scripts|tests)",
    tsConfig: {
      fileName: "tsconfig.json",
    },
    enhancedResolveOptions: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"],
    },
  },
};
