import env from './_env';
import utils from './_utils';

describe('ProfileEmails', () => {
  let page;

  beforeAll(async () => {
    page = await context.newPage();
    await page.goto(env.baseUrl);
  });

  it('shows user dashboard after logging in', async () => {
    await utils.login(page);

    expect(await page.url()).toContain('/user');
    expect(await page.content()).toContain(env.testUserNameGiven);
    expect(await page.content()).toContain(env.testUserNameFamily);
  });

  it('shows user profile after clicking dashboard button', async () => {
    await page.click('.t-btn-profile');
    await page.waitForSelector('.t-page--profile-show');

    expect(await page.url()).toContain('/profile');
    expect(await page.content()).toContain(env.testUserNameGiven);
    expect(await page.content()).toContain('Basic profile info');
  });

  it('allows user to edit profile', async () => {
    await page.click('.t-btn-profile-edit');
    await page.waitForSelector('.t-page--profile-edit');

    expect(await page.url()).toContain('/profile/edit');
    expect(await page.content()).toContain(env.testUserNameGiven);
    expect(await page.content()).toContain(env.testUserNameFamily);
    expect(await page.content()).toContain('Manage basic info');
  });

  it('allows user to add a recovery email address', async () => {
    const randomValue = Math.floor(Math.random() * 100000);
    const randomEmail = `fake${randomValue}@example.com`;

    const email = await page.$('#email_new');
    await email.click({ clickCount: 3 });
    await email.type(randomEmail);

    await page.click('.t-btn-update-email');
    await page.waitForSelector('.t-page--profile-edit');
    expect(await page.url()).toContain('/profile/edit');
    expect(await page.content()).toContain(`A confirmation email has been sent to ${randomEmail}`);
  });

  it('allows user to confirm email address via confirmation link [no-ci]', async () => {
    const message = await utils.openMailhogMessage(page, 3);

    // Grab the email confirmation URL and visit it.
    const confirmationUrl = await message.$eval('p:nth-child(3) a', el => el.innerText);
    await page.goto(confirmationUrl.replace('.test', '.test:8080'));

    await page.waitForSelector('.t-page--profile-edit');
    expect(await page.url()).toContain('/profile/edit');
    expect(await page.content()).toContain('Thank you for confirming your email address.');
  });

  it('successfully cleaned up Mailhog [no-ci]', async () => {
    await utils.clearMailhog(page, expect);
  });
});
