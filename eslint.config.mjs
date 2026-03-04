import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const eslintConfig = [
    ...compat.extends("next/core-web-vitals"),
    ...compat.extends("plugin:tailwindcss/recommended"),
    ...compat.extends("plugin:jsx-a11y/recommended"),
    {
        plugins: {
            import: (await import("eslint-plugin-import")).default,
        },
        rules: {
            "tailwindcss/no-custom-classname": "off",
            "tailwindcss/classnames-order": "warn",
            "import/no-unresolved": ["error", { ignore: ["^@/"] }],
            "import/no-duplicates": "warn",
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
