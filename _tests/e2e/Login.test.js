import env from './_env';

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

  it('allows user to log in when credentials are valid', async () => {
    const email = await page.$('#email');
    await email.click({ clickCount: 3 });
    await email.type(env.testUserEmail);

    const password = await page.$('#password');
    await password.click({ clickCount: 3 });
    await password.type(env.testUserPassword);

    await page.click('.t-btn--login');
    await page.waitForSelector('.t-page--dashboard');

    expect(await page.url()).toContain('/user');
    expect(await page.content()).toContain(env.testUserNameGiven);
    expect(await page.content()).toContain(env.testUserNameFamily);
  });
});
