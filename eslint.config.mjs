import nextVitals from "eslint-config-next/core-web-vitals";
import importPlugin from "eslint-plugin-import";

const eslintConfig = [
    {
        ignores: [
            "src/dataconnect-generated/**",
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
        },
        rules: {
            "import/no-unresolved": ["error", { ignore: ["^@/"] }],
            "import/no-duplicates": "error",
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
