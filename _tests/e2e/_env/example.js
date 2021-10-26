module.exports = {
  baseUrl: 'http://hid.test',
  mailhogUrl: 'http://localhost:8025',

  // Standard HID user.
  testUserId: '',
  testUserNameGiven: 'Test',
  testUserNameFamily: 'E2E User',
  testUserEmail: 'user@example.com',
  testUserEmailRecovery: 'recovery@example.com',
  testUserPassword: '123456789aA!',

  // HID Admin
  testAdminUserId: '',
  testAdminUserNameGiven: 'Admin',
  testAdminUserNameFamily: 'E2E User',
  testAdminUserEmail: 'admin@example.com',
  testAdminUserPassword: '123456789aA!',

  // Feel free to create this client in your local API, or use one that exists.
  oauthSimple: {
    response_type: 'token',
    client_id: 'test-client-id',
    redirect_uri: 'http://debug.test/login/callback',
    state: '12345',
  },

  // Feel free to create this client in your local API, or use one that exists.
  oauthSecure: {
    response_type: 'code',
    client_id: 'test-client-id',
    client_secret: '0123456789abcdefghijklmnopqrstuvwxyz',
    redirect_uri: 'http://debug.test/login/callback',
    state: '12345',
  },
};
