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
      // 빈 catch는 '최선 노력(best-effort)' 스왈로우로 의도된 패턴 — 허용
      'no-empty': ['error', { allowEmptyCatch: true }],
      // _로 시작하는 변수/인자, 그리고 잡았지만 안 쓰는 에러는 무시
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
    },
  },
  // Vercel 서버리스 함수는 Node 런타임 — process·Buffer·fetch 등 Node 전역 사용
  {
    files: ['api/**/*.js'],
    languageOptions: {
      globals: { ...globals.node, fetch: 'readonly', URL: 'readonly' },
    },
  },
])
