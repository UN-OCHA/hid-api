//
// Assets directory contains browser-JS instead of node.js like the rest of the
// codebase. Since we still fully support IE11, a special config file to broadly
// eliminate modern conventions seemed best.
//
module.exports = {
  env: {
    browser: true,
    es6: false,
  },
  extends: 'airbnb-base',
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 5,
  },
  rules: {
    'no-underscore-dangle': 'off',
    'no-var': 'off',
    'prefer-arrow-callback': 'off',
    'prefer-const': 'off',
    'prefer-template': 'off',
  },
};
