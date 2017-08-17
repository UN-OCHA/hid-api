'use strict';
/* global describe, it */

const assert = require('assert');

describe('HelperService', () => {
  let HelperService;
  before(() => {
    assert(global.app.services.HelperService);

    HelperService = global.app.services.HelperService;
  });

  describe('#isAuthorizedUrl', () => {
    it ('is invalid 1', () => {
      assert.equal(HelperService.isAuthorizedUrl('https://www.google.fr'), false);
    });
    it ('is invalid 2', () => {
      assert.equal(HelperService.isAuthorizedUrl('https://www.google.fr?url=https://humanitarian.id'), false);
    });
    it ('is valid', () => {
      assert.equal(HelperService.isAuthorizedUrl('https://humanitarian.id/verify'), true);
    });
  });
});
