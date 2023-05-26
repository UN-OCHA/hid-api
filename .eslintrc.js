module.exports = {
  env: {
    browser: false,
    es6: true,
  },
  extends: 'airbnb-base',
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  rules: {
    'max-len': ['error',
      {
        code: 110,
        tabWidth: 2,
        ignoreUrls: true,
        ignoreComments: false,
        ignoreRegExpLiterals: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
      },
    ],
    'no-plusplus': 'off',
    'no-underscore-dangle': 'off',
    'prefer-destructuring': 'off',
    'import/no-unresolved': [2, {}],
  },
  overrides: [
    {
      files: ['_tests/unit/*.js'],
      rules: {
        'object-curly-newline': 0,
        'no-multi-assign': 0,
        'no-unused-vars': [
          'error', {
            varsIgnorePattern: 'setup|before',
          },
        ],
      },
    },
  ],
};
