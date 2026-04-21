module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true
  },
  parser: "vue-eslint-parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    parser: "@typescript-eslint/parser",
    extraFileExtensions: [".vue"]
  },
  extends: [
    "eslint:recommended",
    "plugin:vue/vue3-recommended",
    "@vue/typescript/recommended",
    "@vue/prettier",
    "prettier"
  ],
  plugins: ["vue", "@typescript-eslint"],
  rules: {
    "vue/multi-word-component-names": "off",
    "vue/no-v-html": "warn",
    "vue/require-default-prop": "off",
    "vue/require-explicit-emits": "off",
    "vue/attribute-hyphenation": ["error", "always"],
    "vue/component-name-in-template-casing": ["error", "PascalCase"],
    "vue/component-definition-name-casing": ["PascalCase"],
    "vue/custom-event-name-casing": ["error", "camelCase"],
    "vue/prop-name-casing": ["camelCase"],
    "vue/v-on-event-hyphenation": ["error", "always"],

    "no-console": [
      "error",
      { allow: ["warn", "error"] }
    ],
    "no-debugger": "error",
    "no-alert": "error",
    "no-var": "error",
    "prefer-const": "error",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-non-null-assertion": "off",

    "import/order": [
      "error",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          ["parent", "sibling"],
          "index",
          "type"
        ],
        pathGroups: [
          { pattern: "vue", group: "internal", position: "before" },
          { pattern: "pinia", group: "internal", position: "after" },
          { pattern: "vue-router", group: "internal", position: "after" },
          { pattern: "@ant-design/**", group: "internal", position: "after" },
          { pattern: "@ant-design/icons-vue", group: "internal", position: "after" },
          { pattern: "@/**", group: "internal", position: "after" }
        ],
        pathGroupsExcludedImportTypes: ["type"],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true }
      }
    ],
    "import/newline-after-import": ["error", { count: 1 }],
    "import/no-duplicates": "error",
    "import/no-unresolved": "off",

    "padding-line-between-statements": [
      "error",
      { blankLine: "always", prev: "*", next: "return" },
      { blankLine: "always", prev: ["const", "let", "var"], next: "*" },
      { blankLine: "any", prev: ["const", "let", "var"], next: ["const", "let", "var"] },
      { blankLine: "always", prev: "directive", next: "*" },
      { blankLine: "any", prev: "directive", next: "directive" }
    ],

    "max-len": [
      "warn",
      { code: 100, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true }
    ],
    "comma-dangle": ["error", "always-multiline"],
    quotes: ["error", "double", { avoidEscape: true }],
    semi: ["error", "always"],
    indent: ["error", 2, { SwitchCase: 1, ignoredNodes: ["TemplateLiteral"] }],

    "object-curly-spacing": ["error", "always"],
    "array-bracket-spacing": ["error", "never"],
    "space-before-blocks": "error",
    "keyword-spacing": "error",
    "space-infix-ops": "error",
    "no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0, maxBOF: 0 }]
  },
  settings: {
    "import/resolver": {
      typescript: {}
    }
  },
  overrides: [
    {
      files: ["*.vue"],
      rules: {
        "indent": "off",
        "vue/script-indent": ["error", 2, { baseIndent: 0, switchCase: 1 }]
      }
    },
    {
      files: ["*.ts", "*.tsx"],
      rules: {
        "no-undef": "off"
      }
    },
    {
      files: ["**/__tests__/**/*", "**/*.spec.ts", "**/*.test.ts"],
      env: { jest: true },
      rules: {
        "no-console": "off"
      }
    },
    {
      files: ["vite.config.*", "*.config.js", "*.config.ts"],
      env: { node: true }
    }
  ],
  ignorePatterns: [
    "dist/",
    "node_modules/",
    "*.min.js",
    "*.d.ts",
    ".env*",
    "coverage/"
  ]
};
