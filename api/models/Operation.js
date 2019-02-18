

const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * @module Operation
 * @description Operation
 */

const OperationSchema = new Schema({
  remote_id: {
    type: Number,
    readonly: true,
  },
  managers: [{
    type: Schema.ObjectId,
    ref: 'User',
  }],
  url: {
    type: String,
    readonly: true,
  },
  key_lists: [{
    type: Schema.ObjectId,
    ref: 'List',
  }],
  key_roles: [{
    type: Schema.ObjectId,
    ref: 'List',
  }],
}, {
  collection: 'operation',
});

OperationSchema.methods = {
  managersIndex(user) {
    let index = -1;
    for (let i = 0; i < this.managers.length; i += 1) {
      if (this.managers[i].id === user.id) {
        index = i;
      }
    }
    return index;
  },
};

module.exports = mongoose.model('Operation', OperationSchema);
