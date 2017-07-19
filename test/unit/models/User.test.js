'use strict';
/* global describe, it */

const assert = require('assert');

describe('User Model', () => {
  let User;
  before(() => {
    assert(global.app.models.User);

    User = global.app.models.User;
  });

  describe('#isStrongPassword', () => {
    it ('does not have numbers', () => {
      assert.equal(User.isStrongPassword('testTest'), false);
    });
    it ('does not have uppercase', () => {
      assert.equal(User.isStrongPassword('testtest2'), false);
    });
    it ('is not long enough', () => {
      assert.equal(User.isStrongPassword('ATest2'), false);
    });
    it ('should be strong enough', () => {
      assert(User.isStrongPassword('ATestTest3'));
    });
  });

});
