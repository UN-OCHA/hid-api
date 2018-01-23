'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');
const fs = require('fs');
const credentials = JSON.parse(fs.readFileSync('keys/outlook.json'));
const oauth2 = require('simple-oauth2').create(credentials);

/**
 * @module OutlookController
 * @description Generated Trails.js Controller.
 */
module.exports = class OutlookController extends Controller{

  saveOutlookCredentials (request, reply) {
    const that = this;
    if (request.payload.code && request.payload.redirectUri) {
      oauth2.authorizationCode.getToken({
        code: request.payload.code,
        redirect_uri: request.payload.redirectUri,
        scope: 'openid offline_access'
      }, function (error, result) {
        if (error) {
          that.app.services.ErrorService.handle(error, request, reply);
        }
        else {
          console.log(result);
          reply(result);
        }
      });
    }
    else {
      return reply(Boom.badRequest());
    }
  }

};
