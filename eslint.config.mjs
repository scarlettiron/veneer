import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

//Flat ESLint config for the whole workspace.
//The stylistic spaced-comment rule enforces the project comment style
//where there is no space between the slashes and the first letter.
export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.next/**', '**/coverage/**'],
  },
  ...tseslint.configs.recommended,
  {
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/spaced-comment': ['error', 'never', { markers: ['/'] }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
);
