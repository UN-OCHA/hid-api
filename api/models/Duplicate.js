/**
 * @module Duplicate
 * @description Duplicates. Seemingly left over form v1 -> v2 migration.
 */
const mongoose = require('mongoose');
const validate = require('mongoose-validator');

const { Schema } = mongoose;


const DuplicateSchema = new Schema({}, {
  collection: 'duplicate',
});

module.exports = mongoose.model('Duplicate', DuplicateSchema);
