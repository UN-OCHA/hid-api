/**
 * Main Configuration
 */
const path = require('path');

module.exports = {
  packs: [],

  /**
   * Define application paths here. "root" is the only required path.
   */
  paths: {
    root: path.resolve(__dirname, '..'),
    temp: path.resolve(__dirname, '..', '.tmp'),
    www: path.resolve(__dirname, '..', 'assets'),
  },
};
