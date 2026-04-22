// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import nextVitals from "eslint-config-next/core-web-vitals";
import playwrightPlugin from "eslint-plugin-playwright";
import unusedImports from "eslint-plugin-unused-imports";

const playwrightRecommended = playwrightPlugin.configs["flat/recommended"];

const eslintConfig = [{
    ignores: [
        "src/dataconnect-generated/**",
        "src/dataconnect-admin-generated/**",
        "output/**",
        "qa-screenshots/**",
        "storybook-static/**",
        ".playwright-cli/**",
        "build.log",
        "check.log",
    ],
}, ...nextVitals, {
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    plugins: {
        "unused-imports": unusedImports,
    },
    rules: {
        "import/no-unresolved": ["error", { ignore: ["^@/", "^firebase-functions.*", "^@google-cloud/bigquery"] }],
        "import/no-duplicates": "error",
        "unused-imports/no-unused-imports": "error",
        "no-restricted-syntax": [
            "error",
            {
                "selector": "JSXText[value=/\\\\b(oops)\\\\b/i]",
                "message": "Banned rhetoric: Do not use 'Oops'. Use explicit declarative failure messages."
            },
            {
                "selector": "JSXText[value=/\\\\b(credits|tokens|points)\\\\b/i]",
                "message": "Banned vocabulary: Use 'GumDrops' instead of credits, tokens, or points."
            },
            {
                "selector": "JSXText[value=/it looks like/i]",
                "message": "Banned rhetoric: No guessing. State what is known."
            },
            {
                "selector": "JSXText[value=/\\\\b(fake|simulated)\\\\b/i]",
                "message": "Banned rhetoric: Do not leak simulated states into Truth panels."
            }
        ],
    },
    settings: {
        "import/resolver": {
            typescript: {
                alwaysTryTypes: true,
            },
        },
    },
}, {
    files: ["tests/ui-audits/**/*.spec.{ts,tsx}"],
    plugins: playwrightRecommended.plugins,
    languageOptions: playwrightRecommended.languageOptions,
    rules: {
        "playwright/expect-expect": [
            "error",
            { assertFunctionNames: ["expectNoAxeViolations", "expectAxeViolationsToMatchBaseline"] },
        ],
        "playwright/missing-playwright-await": "error",
        "playwright/no-focused-test": "error",
        "playwright/no-networkidle": "error",
        "playwright/no-standalone-expect": "error",
        "playwright/no-unsafe-references": "error",
        "playwright/no-unused-locators": "error",
        "playwright/no-wait-for-navigation": "error",
        "playwright/prefer-web-first-assertions": "error",
        "playwright/valid-describe-callback": "error",
        "playwright/valid-expect": "error",
        "playwright/valid-test-tags": "error",
        "playwright/valid-title": "error",
    },
}, ...storybook.configs["flat/recommended"]];

export default eslintConfig;
