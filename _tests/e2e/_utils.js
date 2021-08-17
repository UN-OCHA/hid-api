import env from './_env';

/**
 * Utilities for testing HID interface
 */
module.exports = {
  //
  // Login to HID Auth.
  //
  async login(page) {
    await page.goto(env.baseUrl);

    const email = await page.$('#email');
    await email.click({ clickCount: 3 });
    await email.type(env.testUserEmail);

    const password = await page.$('#password');
    await password.click({ clickCount: 3 });
    await password.type(env.testUserPassword);

    await page.click('.t-btn--login');
  },
};
