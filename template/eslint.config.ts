import { globalIgnores } from "eslint/config";
import { defineConfigWithVueTs, vueTsConfigs } from "@vue/eslint-config-typescript";
import pluginVue from "eslint-plugin-vue";
import skipFormatting from "@vue/eslint-config-prettier/skip-formatting";

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: "app/files-to-lint",
    // Include JS, JSX, MJS and CJS so the rules below apply to all JS/TS files and Vue script blocks
    files: ["**/*.{js,jsx,cjs,mjs,ts,mts,tsx,vue}"],
  },

  globalIgnores(["**/dist/**", "**/dist-ssr/**", "**/coverage/**"]),

  pluginVue.configs["flat/essential"],
  vueTsConfigs.recommended,
  skipFormatting,
  // language/globals/parserOptions migrated from .eslintrc.cjs
  {
    languageOptions: {
      globals: {
        // keep the same semantics as the original .eslintrc.cjs
        globalThis: false,
        exec: "readonly",
        getCurrentPages: "readonly",
        uniCloud: "readonly",
        uni: "readonly",
        wx: "readonly",
        getApp: "readonly",
        log: "readonly",
      },
      parserOptions: { ecmaVersion: "latest" },
    },
  },
  // Project-specific rule overrides (migrated from .eslintrc.cjs)
  {
    rules: {
      "no-empty": "off",
      "max-len": ["warn", { code: 100, ignoreComments: true, ignoreStrings: true }],
      "prefer-const": [
        "error",
        {
          destructuring: "all",
          ignoreReadBeforeAssign: false,
        },
      ],
      "vue/no-unused-vars": [
        "warn",
        {
          ignorePattern: "^_",
        },
      ],
      // Ensure TypeScript-specific unused variable rule is also only a warning
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { vars: "all", args: "after-used", argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-unused-vars": ["warn", { vars: "all", args: "after-used", argsIgnorePattern: "^_" }],
      "vue/multi-word-component-names": "off",
    },
  },
);
