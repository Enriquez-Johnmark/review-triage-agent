import js from "@eslint/js"
import tseslint from "typescript-eslint"

export default tseslint.config(
  { ignores: ["node_modules", "data", "web"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      // Time is read only through the injected clock (architecture.md).
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: "Read time through the Clock.",
        },
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: "Read time through the Clock.",
        },
      ],
    },
  },
  { files: ["eslint.config.js"], ...tseslint.configs.disableTypeChecked },
)
