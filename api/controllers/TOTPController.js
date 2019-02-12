'use strict';

const authenticator = require('authenticator');
const Boom = require('boom');
const QRCode = require('qrcode');
const BCrypt = require('bcryptjs');
const HelperService = require('../services/HelperService');
const config = require('../../config/env')[process.env.NODE_ENV];
const logger = config.logger;

/**
 * @module TOTPController
 * @description Generated Trails.js Controller.
 */
module.exports = {

  // Creates a shared secret and generates a QRCode based on this shared secret
  generateQRCode: async function (request, reply) {
    const user = request.params.currentUser;
    if (user.totp === true) {
      // TOTP is already enabled, user needs to disable it first
      logger.warn('2FA already enabled. Can not generate QRCode.', { security: true, fail: true, request: request});
      throw Boom.badRequest('You have already enabled 2FA. You need to disable it first');
    }
    const secret = authenticator.generateKey();
    const mfa = {
      secret: secret
    };
    user.totpConf = mfa;
    await user.save();
    let qrCodeName = 'HID (' + process.env.NODE_ENV + ')';
    if (process.env.NODE_ENV === 'production') {
      qrCodeName = 'HID';
    }
    const otpauthUrl = authenticator.generateTotpUri(secret, user.name, qrCodeName, 'SHA1', 6, 30);
    const qrcode = await QRCode.toDataURL(otpauthUrl);
    return reply({url: qrcode});
  },

  // Empty endpoint to verify a TOTP token
  verifyTOTPToken: function (request, reply) {
    reply();
  },

  // Enables TOTP for current user
  enable: async function (request, reply) {
    const user = request.params.currentUser;
    if (user.totp === true) {
      // TOTP is already enabled, user needs to disable it first
      logger.warn('2FA already enabled. No need to reenable.', { security: true, fail: true, request: request});
      throw Boom.badRequest('2FA is already enabled. You need to disable it first');
    }
    const method = request.payload ? request.payload.method : '';
    if (method !== 'app' && method !== 'sms') {
      throw Boom.badRequest('Valid 2FA method is required');
    }
    user.totpMethod = request.payload.method;
    user.totp = true;
    await user.save();
    return reply(user);
  },

  // Disables TOTP for current user
  disable: async function (request, reply) {
    const user = request.params.currentUser;
    if (user.totp !== true) {
      // TOTP is already disabled
      logger.warn('2FA already disabled.', { security: true, fail: true, request: request});
      throw Boom.badRequest('2FA is already disabled.');
    }
    user.totp = false;
    user.totpConf = {};
    await user.save();
    return reply(user);
  },

  saveDevice: async function (request, reply) {
    await HelperService.saveTOTPDevice(request, request.params.currentUser);
    const tindex = request.params.currentUser.trustedDeviceIndex(request.headers['user-agent']);
    const secret = request.params.currentUser.totpTrusted[tindex].secret;
    return reply({'x-hid-totp-trust': secret}).state('x-hid-totp-trust', secret, { ttl: 30 * 24 * 60 * 60 * 1000, domain: 'humanitarian.id', isSameSite: false, isHttpOnly: false});
  },

  destroyDevice: async function (request, reply) {
    const user = request.params.currentUser;
    const deviceId = request.params.id;
    const device = user.totpTrusted.id(deviceId);
    if (device) {
      user.totpTrusted.id(deviceId).remove();
      await user.save();
      return reply().code(204);
    }
    else {
      throw Boom.notFound();
    }
  },

  generateBackupCodes: async function (request, reply) {
    const user = request.params.currentUser;
    if (!user.totp) {
      throw Boom.badRequest('TOTP needs to be enabled');
    }
    const codes = [], hashedCodes = [];
    for (let i = 0; i < 16; i++) {
      codes.push(HelperService.generateRandom());
    }
    for (let i = 0; i < 16; i++) {
      hashedCodes.push(BCrypt.hashSync(codes[i], 5));
    }
    // Save the hashed codes in the user and show the ones which are not hashed
    user.totpConf.backupCodes = hashedCodes;
    user.markModified('totpConf');
    await user.save();
    return reply(codes);
  }
};
