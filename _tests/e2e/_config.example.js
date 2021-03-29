/**
 * Config object for testing HID Auth.
 */
module.exports = {
  // Point to your local HID API
  baseUrl: 'http://hid.test',

  // Populate with a test user
  userEmail: '14@example.com',
  userPass: '123456789aA!',
  userNameFirst: 'E2E',
  userNameLast: 'Test User',

  // Feel free to create this client in your local API, or use one that exists.
  simple: {
    response_type: 'token',
    client_id: 'test-client-id',
    redirect_uri: 'http://debug.test/login/callback',
    state: '12345',
  },

  // Feel free to create this client in your local API, or use one that exists.
  secure: {
    response_type: 'code',
    client_id: 'test-client-id',
    client_secret: '0123456789abcdefghijklmnopqrstuvwxyz',
    redirect_uri: 'http://debug.test/login/callback',
    state: '12345',
  },
};
