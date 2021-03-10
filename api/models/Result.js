/**
 * @module Result
 * @description Results. Seemingly left over form v1 -> v2 migration.
 */
const mongoose = require('mongoose');
const validate = require('mongoose-validator');

const { Schema } = mongoose;


const ResultSchema = new Schema({}, {
  collection: 'results',
});

module.exports = mongoose.model('Result', ResultSchema);
