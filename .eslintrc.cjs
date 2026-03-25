module.exports = {
  extends: [
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'mantine',
    'plugin:react-hooks/recommended',
  ],
  plugins: ['react-hooks', 'testing-library', 'jest'],
  overrides: [
    {
      files: ['**/?(*.)+(spec|test).[jt]s?(x)'],
      extends: ['plugin:testing-library/react'],
    },
  ],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  parser: '@typescript-eslint/parser',
  rules: {
    // Rule exists for inline disables; project not migrated to strict deps yet
    'react-hooks/exhaustive-deps': 'off',
    'react/react-in-jsx-scope': 'off',
    'import/extensions': 'off',
    'indent': 'off',
    'import/order': [
      'error',
      {
        'groups': [
          ['builtin', 'external'],
          ['internal'],
          ['sibling', 'parent', 'index'],
        ],
        'pathGroups': [
          {
            'pattern': 'react',
            'group': 'builtin',
            'position': 'before'
          }
        ],
        'pathGroupsExcludedImportTypes': ['react'],
        'newlines-between': 'always',
        'alphabetize': {
          'order': 'asc',
          'caseInsensitive': true
        }
      }
    ],
    'import/no-unresolved': 'off',
    'max-len': [
      'error',
      {
        'code': 100,
        'ignoreUrls': true,
        'ignoreStrings': true,
        'ignoreTemplateLiterals': true,
        'ignoreComments': false,
        'ignoreRegExpLiterals': true
      }
    ]
  },
};
