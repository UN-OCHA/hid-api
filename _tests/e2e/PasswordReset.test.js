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
    await page.type('#email', 'e2e-test@example.com');
    await page.click('.t-btn--reset');
    await page.waitForTimeout(1000);
    expect(await page.content()).toContain('The request to change your password has been received.');
  });
});
