/* eslint-disable no-param-reassign, no-self-assign */
const _ = require('lodash');
const winston = require('winston');

module.exports = {
  hidFormatter: winston.format((info) => {
    // In winston 3, the log object is passed by reference and mutated in place.
    // This is an intentional design decision, so we must be conscious not to
    // accidentally mutate important data that gets passed in, especially our
    // request object, which often gets passed into the logger but then used for
    // additional business logic.
    //
    // To avoid mutating important objects, we use lodash to deep-copy and
    // reassign that particular property so that we can do our sanitization and
    // other formatting without disrupting further operations that occur after
    // the logging statement in the actual event handlers.
    info.request = _.cloneDeep(info.request || {});

    // Set a timestamp
    info['@timestamp'] = new Date().toJSON();

    // Log IP if we have it.
    if (info.request && info.request.info && info.request.info.remoteAddress) {
      info.ip = info.request.info.remoteAddress;
    }
    if (info.request && info.request.headers && info.request.headers['x-forwarded-for']) {
      info.ip = info.request.headers['x-forwarded-for'];
    }

    // Include custom user object from log
    info.user = info.user || {};

    // Include custom oauth object from log
    info.oauth = info.oauth || {};

    // If this is an error/warning and a stack trace was sent, append to log.
    if (['error', 'warn'].includes(info.level) && typeof info.stack_trace !== 'undefined') {
      info.stack_trace = info.stack_trace;
    }

    // Check if we received a request object
    if (info.request) {
      // Include relevant chunks of the node.js request object. If we include
      // whole object wholesale, the recursion creates gigantic, useless logs.
      info.request = {
        path: info.request.path || {},
        query: info.request.query || {},
        payload: info.request.payload || {},
        headers: info.request.headers || {},
        auth: info.request.auth || {},
      };

      // Try to automatically detect user unless info.user.id already exists.
      if (info.request.params && info.request.params.currentUser) {
        if (typeof info.user.id === 'undefined') {
          info.user.id = info.request.params.currentUser._id.toString();
        }
      }

      // Sanitize passwords in request payloads
      if (info.request.payload) {
        if (info.request.payload.password) {
          delete info.request.payload.password;
        }
        if (info.request.payload.confirm_password) {
          delete info.request.payload.confirm_password;
        }
        if (info.request.payload.old_password) {
          delete info.request.payload.old_password;
        }
        if (info.request.payload.new_password) {
          delete info.request.payload.new_password;
        }
        if (info.request.payload.confirmPassword) {
          delete info.request.payload.confirmPassword;
        }
      }

      // Sanitize OAuth client secrets in query/payload
      //
      // This will display "000...000" in ELK.
      if (typeof info.request.query.client_secret === 'string') {
        // display first/last five characters but scrub the rest
        const sanitizedSecret = `${info.request.query.client_secret.slice(0, 3)}...${info.request.query.client_secret.slice(-3)}`;
        info.request.query.client_secret = sanitizedSecret;
      }
      if (typeof info.request.payload.client_secret === 'string') {
        // display first/last five characters but scrub the rest
        const sanitizedSecret = `${info.request.payload.client_secret.slice(0, 3)}...${info.request.payload.client_secret.slice(-3)}`;
        info.request.payload.client_secret = sanitizedSecret;
      }
      if (typeof info.request.payload.secret === 'string') {
        // display first/last five characters but scrub the rest
        const sanitizedSecret = `${info.request.payload.secret.slice(0, 3)}...${info.request.payload.secret.slice(-3)}`;
        info.request.payload.secret = sanitizedSecret;
      }
      if (typeof info.request.payload.code === 'string') {
        // display first/last five characters but scrub the rest
        const sanitizedSecret = `${info.request.payload.code.slice(0, 3)}...${info.request.payload.code.slice(-3)}`;
        info.request.payload.code = sanitizedSecret;
      }

      // Sanitize OAuth client secrets found in Headers
      //
      // This will display "Basic 000...000" in ELK.
      if (
        typeof info.request.headers.authorization === 'string'
        && info.request.headers.authorization.indexOf('Basic') !== -1
      ) {
        const sanitizedSecret = `${info.request.headers.authorization.slice(0, 9)}...${info.request.headers.authorization.slice(-3)}`;
        info.request.headers.authorization = sanitizedSecret;
      }

      // Sanitize JWTs, which can allow anyone to masquerade as this user.
      // We do this by removing the signature at the end, which only our
      // server can generate. That way, we can decode and inspect the payload
      // for debugging purposes, without risking the use of the JWT by devs
      // who have access to ELK.
      if (
        typeof info.request.headers.authorization === 'string'
        && info.request.headers.authorization.indexOf('Bearer') !== -1
      ) {
        let sanitizedJWT = info.request.headers.authorization.split('.');
        if (sanitizedJWT.length === 3) {
          const buffer = Buffer.from(sanitizedJWT[1], 'base64');
          const asciiJWT = buffer.toString('ascii');

          // Now pop the signature off to neuter the usefulness of the logged JWT
          // and prevent ELK from storing actionable credentials.
          sanitizedJWT.pop();
          sanitizedJWT = sanitizedJWT.join('.');
          info.request.headers.authorization = sanitizedJWT;

          // Auto-populate requesting user ID from JWT unless user.id was explicitly
          // passed into the log.
          if (typeof info.user.id === 'undefined') {
            info.user.id = JSON.parse(asciiJWT).id;
          }
        } else {
          // Sanitize the contents without extracting any data
          //
          // This will display "Bearer 000...000" in ELK.
          const sanitizedSecret = `${info.request.headers.authorization.slice(0, 10)}...${info.request.headers.authorization.slice(-3)}`;
          info.request.headers.authorization = sanitizedSecret;
        }
      }

      // Sanitize JWT blacklist requests. For the same reason as Authentication
      // headers in generic requests.
      if (typeof info.request.payload.token === 'string') {
        let sanitizedJWT = info.request.payload.token.split('.');
        sanitizedJWT.pop();
        sanitizedJWT = sanitizedJWT.join('.');
        info.request.payload.token = sanitizedJWT;
      }

      // Sanitize credentials, which seems to contain the entire user object
      // from HID, including numerous pieces of sensitive data.
      if (info.request.auth && info.request.auth.credentials) {
        // Log whether this user is admin or not.
        info.user.admin = info.request.auth.credentials.is_admin;

        // Now delete the credentials object.
        delete info.request.auth.credentials;
      }

      // Sanitize auth artifacts, which also contain secrets
      if (info.request.auth && info.request.auth.artifacts) {
        delete info.request.auth.artifacts;
      }

      // Sanitize 2FA codes
      // headers
      if (info.request.headers && info.request.headers['x-hid-totp']) {
        delete info.request.headers['x-hid-totp'];
      }
      if (info.request.headers && info.request.headers['X-HID-TOTP']) {
        delete info.request.headers['X-HID-TOTP'];
      }
      // payload (during OAuth logins)
      if (info.request.payload && info.request.payload['x-hid-totp']) {
        delete info.request.payload['x-hid-totp'];
      }
      if (info.request.payload && info.request.payload['X-HID-TOTP']) {
        delete info.request.payload['X-HID-TOTP'];
      }
    } // end of request sanitization

    return info;
  }),
};
