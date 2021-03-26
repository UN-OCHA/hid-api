import env from './__env';
import util from './_utils';

describe('PasswordReset', () => {
  let page;

  beforeAll(async () => {
    page = await context.newPage();
    await page.goto(env.baseUrl + '/password');
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

  it('shows positive feedback after submitting valid email address', async () => {
    const input = await page.$('#email');
    await input.click({ clickCount: 3 });
    await page.type('#email', env.testUserEmail);
    await page.click('.t-btn--reset');
    await page.waitForTimeout(1000);
    expect(await page.content()).toContain('The request to change your password has been received.');
  });

  it('allows user to initiate password reset via email', async () => {
    // Mailhog is here when you set up via hid-stack
    await page.goto('http://localhost:8025');
    // We always want the first message in Mailhog.
    await page.click('.messages > *:first-child');
    // Target this message's iframe in Mailhog.
    const message = await page.frames()[1];
    // Mailhog has iframes and the link has target="_blank" and all of that makes
    // it a real PITA to truly click the link and follow it. Let's instead grab
    // the URL and go directly to it:
    const pwResetUrl = await message.$eval('p:nth-child(3) a', el => el.innerText);
    await page.goto(pwResetUrl);
    // Do we see the password reset form?
    expect(await page.content()).toContain('Enter your new password');
  });
});
