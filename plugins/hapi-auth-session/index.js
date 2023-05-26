/**
 * @module hapi-auth-session
 * @description Cookie auth strategy for HID Auth website.
 */
const User = require('../../api/models/User');
const { logger } = require('../../config/env');

const internals = {};

internals.implementation = () => ({
  async authenticate(request, h) {
    const cookie = request.yar.get('session');
    let user;

    // Check that all necessary cookie data exists.
    //
    // @see AuthController->loginHelper
    if (cookie && cookie.userId && cookie.totp) {
      user = await User.findById(cookie.userId);
    }

    // Find a user, pass along credentials, and finish.
    if (user) {
      return h.authenticated({ credentials: user });
    }

    /**
     * If we got this far, the user is not considered authenticated. From here
     * on, the code handles redirecting with a warning message in the UI.
     */
    logger.warn(
      '[hapi-auth-session] No session was found',
      {
        request,
        security: true,
        fail: true,
      },
    );

    // Set an alert for after the redirect.
    const newCookie = {
      alert: {
        type: 'warning',
        message: '<p>Log in to access your account.</p>',
      },
    };
    request.yar.set('session', newCookie);

    // If you redirect here without takeover() it will create errors. The link
    // below leads to @hapi/cookie which offers a configurable redirect option.
    //
    // @see https://github.com/hapijs/cookie/blob/b38dd58d2a32a765178a488766326da958c4627a/lib/index.js#LL225C24-L225C90
    return h.response('Redirecting...').takeover().redirect('/');
  },
});

module.exports = {
  name: 'hapi-auth-session',
  version: '1.0.0',
  requirements: {
    hapi: '>=17.7.0',
  },
  register: (server) => {
    server.auth.scheme('hapi-auth-session', internals.implementation);
  },
};
