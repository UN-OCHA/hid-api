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
    "no-underscore-dangle": "off",
    "prefer-destructuring": "off",
    "no-plusplus": "off",
  },
};
