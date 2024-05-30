/* eslint-disable import/no-extraneous-dependencies */
const postCssImport = require('postcss-import')({});
const postCssNesting = require('postcss-nesting')({});
const postCssO = require('postcss-csso')({});

module.exports = {
  plugins: [
    postCssImport,
    postCssNesting,
    postCssO,
  ],
};
