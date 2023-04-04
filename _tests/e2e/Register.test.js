import env from './_env';
import utils from './_utils';

describe('Register [no-ci]', () => {
  let page;

  beforeAll(async () => {
    page = await context.newPage();
    await page.goto(`${env.baseUrl}/register`);
  });

  it('can be publicly accessed', async () => {
    expect(await page.url()).toContain('/register');
    expect(await page.content()).toContain('Register a Humanitarian ID account');
  });

  it('presents a form with email field', async () => {
    const inputId = await page.$eval('#email', (el) => el.id);
    expect(inputId).toBe('email');
  });

  it('prevents form submission when validation errors are present', async () => {
    let emailFieldInvalid;

    await page.click('.t-btn--register');
    emailFieldInvalid = await page.$$eval('#email:invalid', (el) => el.length);
    expect(emailFieldInvalid).toBeGreaterThan(0);

    await page.type('#email', 'invalid-email-address');
    await page.click('.t-btn--register');
    emailFieldInvalid = await page.$$eval('#email:invalid', (el) => el.length);
    expect(emailFieldInvalid).toBeGreaterThan(0);
  });

  it('shows positive feedback after submitting form', async () => {
    const input = await page.$('#email');
    await input.click({ clickCount: 3 });
    await page.type('#email', `register${Math.floor(Math.random() * 10000)}@example.com`);
    await page.type('#given_name', 'Registration');
    await page.type('#family_name', 'E2E User');
    await page.type('#password', env.testUserPassword);
    await page.type('#confirm_password', env.testUserPassword);
    await page.click('.t-btn--register');
    await page.waitForTimeout(1000);
    expect(await page.content()).toContain('Thank you for creating an account.');
  });

  it('allows user to initiate account confirmation via primary email', async () => {
    const message = await utils.openMailhogMessage(page, 1);

    // Mailhog has iframes and the link has target="_blank" and all of that makes
    // it a real PITA to truly click the link and follow it. Let's instead grab
    // the URL and go directly to it:
    const confirmationUrl = await message.$eval('p:nth-child(3) a', (el) => el.innerText);
    await page.goto(confirmationUrl);
    // Do we see the password reset form?
    expect(await page.content()).toContain('Thank you for confirming your account.');
  });

  it('successfully cleaned up Mailhog', async () => {
    await utils.clearMailhog(page, expect);
  });
});
