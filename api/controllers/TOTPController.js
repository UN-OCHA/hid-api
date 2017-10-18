'use strict';

const authenticator = require('authenticator');
const Boom = require('boom');
const QRCode = require('qrcode');
const Controller = require('trails/controller');
const BCrypt = require('bcryptjs');

/**
 * @module TOTPController
 * @description Generated Trails.js Controller.
 */
module.exports = class TOTPController extends Controller{

  // Creates a shared secret and generates a QRCode based on this shared secret
  generateQRCode (request, reply) {
    const user = request.params.currentUser;
    const that = this;
    if (user.totp === true) {
      // TOTP is already enabled, user needs to disable it first
      this.log.warn('2FA already enabled. Can not generate QRCode.', { security: true, fail: true, request: request});
      return reply(Boom.badRequest('You have already enabled 2FA. You need to disable it first'));
    }
    const secret = authenticator.generateKey();
    const mfa = {
      secret: secret
    };
    user.totpConf = mfa;
    user
      .save()
      .then(() => {
        let qrCodeName = 'HID (' + process.env.NODE_ENV + ')';
        if (process.env.NODE_ENV === 'production') {
          qrCodeName = 'HID';
        }
        const otpauthUrl = authenticator.generateTotpUri(secret, user.name, qrCodeName, 'SHA1', 6, 30);
        QRCode.toDataURL(otpauthUrl, function (err, qrcode) {
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

  // Empty endpoint to verify a TOTP token
  verifyTOTPToken (request, reply) {
    reply();
  }

  // Enables TOTP for current user
  enable (request, reply) {
    const user = request.params.currentUser;
    const that = this;
    if (user.totp === true) {
      // TOTP is already enabled, user needs to disable it first
      this.log.warn('2FA already enabled. No need to reenable.', { security: true, fail: true, request: request});
      return reply(Boom.badRequest('2FA is already enabled. You need to disable it first'));
    }
    const method = request.payload ? request.payload.method : '';
    if (method !== 'app' && method !== 'sms') {
      return reply(Boom.badRequest('Valid 2FA method is required'));
    }
    user.totpMethod = request.payload.method;
    user.totp = true;
    user
      .save()
      .then(() => {
        return reply(user);
      })
      .catch(err => {
        that.app.services.ErrorService.handleError(err, request, reply);
      });
  }

  // Disables TOTP for current user
  disable (request, reply) {
    const user = request.params.currentUser;
    const that = this;
    if (user.totp !== true) {
      // TOTP is already disabled
      this.log.warn('2FA already disabled.', { security: true, fail: true, request: request});
      return reply(Boom.badRequest('2FA is already disabled.'));
    }
    user.totp = false;
    user.totpConf = {};
    user
      .save()
      .then(() => {
        return reply(user);
      })
      .catch(err => {
        that.app.services.ErrorService.handleError(err, request, reply);
      });
  }

  saveDevice (request, reply) {
    const that = this;
    this.app.services.HelperService.saveTOTPDevice(request, request.params.currentUser)
      .then(() => {
        const tindex = request.params.currentUser.trustedDeviceIndex(request.headers['user-agent']);
        const secret = request.params.currentUser.totpTrusted[tindex].secret;
        return reply().state('x-hid-totp-trust', secret, { ttl: 30 * 24 * 60 * 60 * 1000, domain: 'humanitarian.id'});
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  destroyDevice (request, reply) {
    const that = this;
    const user = request.params.currentUser;
    const deviceId = request.params.id;
    const device = user.totpTrusted.id(deviceId);
    if (device) {
      user.totpTrusted.id(deviceId).remove();
      user
        .save()
        .then(() => {
          return reply().code(204);
        })
        .catch(err => {
          that.app.services.ErrorService.handle(err, request, reply);
        });
    }
    else {
      return reply(Boom.notFound());
    }
  }

  generateBackupCodes (request, reply) {
    const user = request.params.currentUser;
    if (!user.totp) {
      return reply(Boom.badRequest('TOTP needs to be enabled'));
    }
    const HelperService = this.app.services.HelperService;
    let codes = [], hashedCodes = [];
    for (let i = 0; i < 16; i++) {
      codes.push(HelperService.generateRandom());
    }
    for (let i = 0; i < 16; i++) {
      hashedCodes.push(BCrypt.hashSync(codes[i], 5));
    }
    // Save the hashed codes in the user and show the ones which are not hashed
    const that = this;
    user.totpConf.backupCodes = hashedCodes;
    user.markModified('totpConf');
    user
      .save()
      .then(() => {
        return reply(codes);
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }
};
