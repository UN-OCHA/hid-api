

const authenticator = require('authenticator');
const Boom = require('boom');
const QRCode = require('qrcode');
const BCrypt = require('bcryptjs');
const HelperService = require('../services/HelperService');
const config = require('../../config/env')[process.env.NODE_ENV];

const { logger } = config;

/**
 * @module TOTPController
 * @description Generated Trails.js Controller.
 */
module.exports = {

  // Creates a shared secret and generates a QRCode based on this shared secret
  async generateQRCode(request) {
    const user = request.auth.credentials;
    if (user.totp === true) {
      // TOTP is already enabled, user needs to disable it first
      logger.warn('2FA already enabled. Can not generate QRCode.', { security: true, fail: true, request });
      throw Boom.badRequest('You have already enabled 2FA. You need to disable it first');
    }
    const secret = authenticator.generateKey();
    const mfa = {
      secret,
    };
    user.totpConf = mfa;
    await user.save();
    let qrCodeName = `HID (${process.env.NODE_ENV})`;
    if (process.env.NODE_ENV === 'production') {
      qrCodeName = 'HID';
    }
    const otpauthUrl = authenticator.generateTotpUri(secret, user.name, qrCodeName, 'SHA1', 6, 30);
    const qrcode = await QRCode.toDataURL(otpauthUrl);
    return { url: qrcode };
  },

  // Empty endpoint to verify a TOTP token
  verifyTOTPToken(request, reply) {
    return reply.response().code(204);
  },

  // Enables TOTP for current user
  async enable(request) {
    const user = request.auth.credentials;
    if (user.totp === true) {
      // TOTP is already enabled, user needs to disable it first
      logger.warn('2FA already enabled. No need to reenable.', { security: true, fail: true, request });
      throw Boom.badRequest('2FA is already enabled. You need to disable it first');
    }
    const method = request.payload ? request.payload.method : '';
    if (method !== 'app' && method !== 'sms') {
      throw Boom.badRequest('Valid 2FA method is required');
    }
    user.totpMethod = request.payload.method;
    user.totp = true;
    await user.save();
    return user;
  },

  // Disables TOTP for current user
  async disable(request) {
    const user = request.auth.credentials;
    if (user.totp !== true) {
      // TOTP is already disabled
      logger.warn('2FA already disabled.', { security: true, fail: true, request });
      throw Boom.badRequest('2FA is already disabled.');
    }
    user.totp = false;
    user.totpConf = {};
    await user.save();
    return user;
  },

  async saveDevice(request, reply) {
    await HelperService.saveTOTPDevice(request, request.auth.credentials);
    const tindex = request.auth.credentials.trustedDeviceIndex(request.headers['user-agent']);
    const { secret } = request.auth.credentials.totpTrusted[tindex];
    return reply.response({ 'x-hid-totp-trust': secret })
      .state('x-hid-totp-trust', secret, {
        ttl: 30 * 24 * 60 * 60 * 1000, domain: 'humanitarian.id', isSameSite: false, isHttpOnly: false,
      });
  },

  async destroyDevice(request, reply) {
    const user = request.auth.credentials;
    const deviceId = request.params.id;
    const device = user.totpTrusted.id(deviceId);
    if (device) {
      user.totpTrusted.id(deviceId).remove();
      await user.save();
      return reply.response().code(204);
    }
    throw Boom.notFound();
  },

  async generateBackupCodes(request) {
    const user = request.auth.credentials;
    if (!user.totp) {
      throw Boom.badRequest('TOTP needs to be enabled');
    }
    const codes = []; const
      hashedCodes = [];
    for (let i = 0; i < 16; i += 1) {
      codes.push(HelperService.generateRandom());
    }
    for (let i = 0; i < 16; i += 1) {
      hashedCodes.push(BCrypt.hashSync(codes[i], 5));
    }
    // Save the hashed codes in the user and show the ones which are not hashed
    user.totpConf.backupCodes = hashedCodes;
    user.markModified('totpConf');
    await user.save();
    return codes;
  },
};
