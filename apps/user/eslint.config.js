import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Downgraded while the codebase adopts the newer react-hooks rules
      // gradually — several existing modals populate form state from props
      // inside an effect (a real pattern, not a bug) and would need a
      // remount-by-key refactor to satisfy this rule as an error.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
