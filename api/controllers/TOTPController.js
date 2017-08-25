'use strict';

const speakeasy = require('speakeasy');
const Boom = require('boom');
const QRCode = require('qrcode');
const Controller = require('trails/controller');

/**
 * @module TOTPController
 * @description Generated Trails.js Controller.
 */
module.exports = class TOTPController extends Controller{

  // Creates a shared secret and generates a QRCode based on this shared secret
  generateQRCode (request, reply) {
    const user = request.params.currentUser;
    const that = this;
    if (user.totp) {
      // TOTP is already enabled, user needs to disable it first
      this.log.warn('2FA already enabled. Can not generate QRCode.', { security: true, fail: true, request: request});
      return reply(Boom.badRequest('You have already enabled 2FA. You need to disable it first'));
    }
    const options = {
      issuer: 'HID',
      name: user.name,
      length: 64
    };
    const { base32, otpauth_url } = speakeasy.generateSecret(options);
    const mfa = {
      created: new Date(),
      enrolled: null,
      secret: base32,
      otp: otpauth_url
    };
    user.totpConf = mfa;
    user
      .save()
      .then(() => {
        QRCode.toDataURL(otpauth_url, function (err, qrcode) {
          if (err) {
            that.app.services.ErrorService.handleError(err, request, reply);
            return;
          }
          reply({url: qrcode});
        });
      })
      .catch(err => {
        that.app.services.ErrorService.handleError(err, request, reply);
      });

  }
};
