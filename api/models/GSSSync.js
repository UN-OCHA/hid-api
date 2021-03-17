const mongoose = require('mongoose');
const fs = require('fs');

const { Schema } = mongoose;

/**
 * @module GSSSync
 * @description GSSSync
 */
const GSSSyncSchema = new Schema({
  list: {
    type: Schema.ObjectId,
    ref: 'List',
    required: [true, 'A list is required'],
  },
  spreadsheet: {
    type: String,
    required: [true, 'A spreadsheet ID is required'],
  },
  sheetId: {
    type: String,
    required: [true, 'A sheet ID is required'],
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
  },
}, {
  collection: 'gsssync',
  timestamps: true,
});

module.exports = mongoose.model('GSSSync', GSSSyncSchema);
