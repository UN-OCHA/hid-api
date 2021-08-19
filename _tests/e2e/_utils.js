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

  //
  // Open Mailhog and return contents of the specified message. Defaults to 1st.
  //
  async openMailhogMessage(page, which) {
    const whichMessage = typeof which === 'number' ? which : 1;

    // Mailhog is here when you set up via hid-stack
    await page.goto('http://localhost:8025');
    // We always want the first message in Mailhog.
    await page.click(`.messages > *:nth-child(${whichMessage})`);
    // Target this message's iframe in Mailhog.
    return page.frames()[1];
  },


  //
  // Clear Mailhog.
  //
  async clearMailhog(page, expect) {
    // Mailhog is here when you set up via hid-stack
    await page.goto('http://localhost:8025');

    // Delete all Mailhog messages.
    await page.click('a[ng-click="deleteAll()"]');
    await page.waitForTimeout(1000);
    await page.click('.modal-dialog .btn-danger');
    await page.waitForTimeout(1000);

    // Confirm everything got cleared out.
    const numMessages = await page.$$eval('.messages > *', el => el.length);
    expect(numMessages).toBe(0);
  },
};
