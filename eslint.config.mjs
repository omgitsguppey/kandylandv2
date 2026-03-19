import nextVitals from "eslint-config-next/core-web-vitals";
import importPlugin from "eslint-plugin-import";
import unusedImports from "eslint-plugin-unused-imports";

const eslintConfig = [
    {
        ignores: [
            "src/dataconnect-generated/**",
            "src/dataconnect-admin-generated/**",
            "output/**",
            "qa-screenshots/**",
            ".playwright-cli/**",
            "build.log",
            "check.log",
        ],
    },
    ...nextVitals,
    {
        files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
        plugins: {
            import: importPlugin,
            "unused-imports": unusedImports,
        },
        rules: {
            "import/no-unresolved": ["error", { ignore: ["^@/"] }],
            "import/no-duplicates": "error",
            "unused-imports/no-unused-imports": "error",
        },
        settings: {
            "import/resolver": {
                typescript: {
                    alwaysTryTypes: true,
                },
            },
        },
    },
];

export default eslintConfig;
