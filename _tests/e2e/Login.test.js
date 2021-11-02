import env from './_env';
import utils from './_utils';

describe('Login', () => {
  let page;

  beforeEach(async () => {
    page = await context.newPage();
    await page.goto(env.baseUrl);
  });

  it('presents a form with email and password inputs', async () => {
    const emailField = await page.$$eval('#email', el => el.length);
    expect(emailField).toBeGreaterThan(0);
    const passwordField = await page.$$eval('#password', el => el.length);
    expect(passwordField).toBeGreaterThan(0);
  });

  it('prevents form submissions when email is missing', async () => {
    await page.click('.t-btn--login');
    const emailFieldInvalid = await page.$$eval('#email:invalid', el => el.length);
    expect(emailFieldInvalid).toBeGreaterThan(0);
  });

  it('prevents form submissions when email is malformed', async () => {
    await page.type('#email', 'notvalid');
    await page.click('.t-btn--login');
    const emailFieldInvalid = await page.$$eval('#email:invalid', el => el.length);
    expect(emailFieldInvalid).toBeGreaterThan(0);
  });

  it('prevents form submissions when password is missing', async () => {
    await page.click('.t-btn--login');
    const passwordFieldInvalid = await page.$$eval('#password:invalid', el => el.length);
    expect(passwordFieldInvalid).toBeGreaterThan(0);
  });

  it('rejects logins from non-existent email addresses', async () => {
    await page.type('#email', 'not.real@example.com');
    await page.type('#password', 'a bad password');
    await Promise.all([
      page.waitForNavigation(),
      page.click('.t-btn--login'),
    ]);

    expect(await page.url()).toContain('/login');
    expect(await page.content()).toContain('We could not log you in.');
  });

  it('rejects logins from unconfirmed recovery email addresses', async () => {
    await page.type('#email', env.testUserEmailRecoveryUnconfirmed);
    const password = await page.$('#password');
    await password.click({ clickCount: 3 });
    await password.type(env.testUserPassword);
    await Promise.all([
      page.waitForNavigation(),
      page.click('.t-btn--login'),
    ]);

    expect(await page.url()).toContain('/login');
    expect(await page.content()).toContain('We could not log you in.');
  });

  it('accepts logins from confirmed recovery email addresses', async () => {
    await page.type('#email', env.testUserEmailRecovery);
    const password = await page.$('#password');
    await password.click({ clickCount: 3 });
    await password.type(env.testUserPassword);
    await Promise.all([
      page.waitForNavigation(),
      page.click('.t-btn--login'),
    ]);

    expect(await page.url()).toContain('/user');
    expect(await page.content()).toContain(env.testUserNameGiven);
    expect(await page.content()).toContain(env.testUserNameFamily);
  });

  it('allows user to log in when credentials are valid', async () => {
    await utils.logout(page);
    await utils.login(page);

    expect(await page.url()).toContain('/user');
    expect(await page.content()).toContain(env.testUserNameGiven);
    expect(await page.content()).toContain(env.testUserNameFamily);
  });
});
