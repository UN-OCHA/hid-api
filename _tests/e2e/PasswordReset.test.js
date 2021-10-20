import env from './_env';
import utils from './_utils';

describe('PasswordReset [no-ci]', () => {
  let page;

  beforeAll(async () => {
    page = await context.newPage();
    await page.goto(`${env.baseUrl}/password`);
  });

  it('can be publicly accessed', async () => {
    expect(await page.url()).toContain('/password');
    expect(await page.content()).toContain('Reset Password');
  });

  it('presents a form with email field', async () => {
    const inputId = await page.$eval('#email', el => el.id);
    expect(inputId).toBe('email');
  });

  it('prevents form submission when validation errors are present', async () => {
    let emailFieldInvalid;

    await page.click('.t-btn--reset');
    emailFieldInvalid = await page.$$eval('#email:invalid', el => el.length);
    expect(emailFieldInvalid).toBeGreaterThan(0);

    await page.type('#email', 'invalid-email-address');
    await page.click('.t-btn--reset');
    emailFieldInvalid = await page.$$eval('#email:invalid', el => el.length);
    expect(emailFieldInvalid).toBeGreaterThan(0);
  });

  it('shows positive feedback after submitting primary email address', async () => {
    const input = await page.$('#email');
    await input.click({ clickCount: 3 });
    await page.type('#email', env.testUserEmail);
    await page.click('.t-btn--reset');
    await page.waitForTimeout(1000);
    expect(await page.content()).toContain('The request to change your password has been received.');
  });

  it('allows user to initiate password reset via primary email', async () => {
    const message = await utils.openMailhogMessage(page, 1);

    // Mailhog has iframes and the link has target="_blank" and all of that makes
    // it a real PITA to truly click the link and follow it. Let's instead grab
    // the URL and go directly to it:
    const pwResetUrl = await message.$eval('p:nth-child(3) a', el => el.innerText);
    await page.goto(pwResetUrl);
    // Do we see the password reset form?
    expect(await page.content()).toContain('Enter your new password');
  });

  // This test assumes you are on the URL we extracted from Mailhog.
  it('prevents user from submitting invalid passwords', async () => {
    const password = await page.$('#password');
    await password.type('invalid');
    const confirm = await page.$('#confirm_password');
    await confirm.type('not the same');

    await page.click('.t-btn--reset-pw');
    const passwordInvalid = await page.$$eval('#password:invalid', el => el.length);
    expect(passwordInvalid).toBeGreaterThan(0);
    const confirmInvalid = await page.$$eval('#confirm_password:invalid', el => el.length);
    expect(confirmInvalid).toBeGreaterThan(0);
  });

  // This test assumes you are on the URL we extracted from Mailhog.
  it('allows user to reset using an approved password', async () => {
    const password = await page.$('#password');
    const confirm = await page.$('#confirm_password');

    // Fill in the form properly. We use the password in the env config, but
    // reverse the string to make multuple runs a bit easier since the config
    // can be tested, then reverted back to original in a second run.
    await password.click({ clickCount: 3 });
    await password.type(env.testUserPassword.split('').reverse().join(''));
    await confirm.click({ clickCount: 3 });
    await confirm.type(env.testUserPassword.split('').reverse().join(''));

    await page.click('.t-btn--reset-pw');
    await page.waitForTimeout(2000);
    expect(await page.content()).toContain('Thank you for updating your password.');
  });

  it('immediately shows an error when password reset link is invalid', async () => {
    // In this case we want the SAME link as the first time, to verify that it
    // can't be reused.
    const message = await utils.openMailhogMessage(page);

    // Mailhog has iframes and the link has target="_blank" and all of that makes
    // it a real PITA to truly click the link and follow it. Let's instead grab
    // the URL and go directly to it:
    const pwResetUrl = await message.$eval('p:nth-child(3) a', el => el.innerText);
    await page.goto(pwResetUrl);
    // Do we see the password reset error?
    expect(await page.content()).toContain('Your password reset link is either invalid or expired.');
  });

  it('shows positive feedback after submitting recovery email address', async () => {
    await page.goto(`${env.baseUrl}/password`);
    const input = await page.$('#email');
    await input.click({ clickCount: 3 });
    await page.type('#email', env.testUserEmailRecovery);
    await page.click('.t-btn--reset');
    await page.waitForTimeout(1000);
    expect(await page.content()).toContain('The request to change your password has been received.');
  });

  it('allows user to initiate password reset via recovery email', async () => {
    const message = await utils.openMailhogMessage(page, 1);

    // Mailhog has iframes and the link has target="_blank" and all of that makes
    // it a real PITA to truly click the link and follow it. Let's instead grab
    // the URL and go directly to it:
    const pwResetUrl = await message.$eval('p:nth-child(3) a', el => el.innerText);
    await page.goto(pwResetUrl);
    // Do we see the password reset form?
    expect(await page.content()).toContain('Enter your new password');
  });

  // This test assumes you are on the URL we extracted from Mailhog.
  it('allows user to reset using an approved password', async () => {
    const password = await page.$('#password');
    const confirm = await page.$('#confirm_password');

    // Fill in the form properly. We use the password in the env config, but
    // reverse the string to make multuple runs a bit easier since the config
    // can be tested, then reverted back to original in a second run.
    await password.click({ clickCount: 3 });
    await password.type(env.testUserPassword);
    await confirm.click({ clickCount: 3 });
    await confirm.type(env.testUserPassword);

    await page.click('.t-btn--reset-pw');
    await page.waitForTimeout(2000);
    expect(await page.content()).toContain('Thank you for updating your password.');
  });

  it('successfully cleaned up Mailhog', async () => {
    await utils.clearMailhog(page, expect);
  });
});
