/* eslint-disable import/no-extraneous-dependencies */
const postCssImport = require('postcss-import')({});
const postCssO = require('postcss-csso')({});

module.exports = {
  plugins: [
    postCssImport,
    postCssO,
  ],
};
