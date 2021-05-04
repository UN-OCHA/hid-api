import env from './_env';

describe('OCHAServicesDropdown', () => {
  beforeAll(async () => {
    await page.goto(`${env.baseUrl}`);
  });

  it('should expand when clicked', async () => {
    const toggle = await page.$('#cd-ocha-dropdown-toggler');
    await toggle.click();
    const hidden = await page.$eval('#cd-ocha-dropdown', el => el.dataset.cdHidden);
    await expect(hidden).toMatch('false');
  });

  it('should contain up to four links in the Related Platforms section', async () => {
    const relatedPlatformsLimit = 4;
    await page.waitForSelector('.cd-ocha-dropdown__section:first-child', { timeout: 10000 });
    const relatedPlatformsLength = await page.$$eval('.cd-ocha-dropdown__section:first-child', nodeList => nodeList.length);
    await expect(relatedPlatformsLength).toBeLessThanOrEqual(relatedPlatformsLimit);
  });

  it('should contain eight links in the Other OCHA Services section', async () => {
    const otherOchaServicesLimit = 8;
    await page.waitForSelector('.cd-ocha-dropdown__section:not(:first-child)', { timeout: 10000 });
    const otherOchaServicesLength = await page.$$eval('.cd-ocha-dropdown__section:not(:first-child)', nodeList => nodeList.length);
    await expect(otherOchaServicesLength).toBeLessThanOrEqual(otherOchaServicesLimit);
  });

  it('should contain specific links in the Other OCHA Services section', async () => {
    const otherOchaServicesCorporate = [
      'Financial Tracking Service',
      'Humanitarian Data Exchange',
      'Humanitarian ID',
      'Humanitarian Response',
      'Inter-Agency Standing Committee',
      'OCHA website',
      'ReliefWeb',
      'Virtual OSOCC',
    ];
    const otherOchaServicesCorporateHref = [
      'https://fts.unocha.org/',
      'https://data.humdata.org/',
      'https://auth.humanitarian.id/',
      'https://humanitarianresponse.info/',
      'https://interagencystandingcommittee.org/',
      'https://unocha.org/',
      'https://reliefweb.int/',
      'https://vosocc.unocha.org/',
    ];
    const otherOchaServices = await page.$$eval('.cd-ocha-dropdown__section:not(:first-child) .cd-ocha-dropdown__link a', texts => texts.map(text => text.textContent).slice(0, 8));
    const otherOchaServicesHref = await page.$$eval('.cd-ocha-dropdown__section:not(:first-child) .cd-ocha-dropdown__link a', anchors => anchors.map(anchor => anchor.href).slice(0, 8));
    await expect(otherOchaServices).toEqual(otherOchaServicesCorporate);
    await expect(otherOchaServicesHref).toEqual(otherOchaServicesCorporateHref);
  });

  it('should include a button to UNOCHA.org DS list', async () => {
    const seeAllButtonHref = await page.$eval('.cd-ocha-dropdown__see-all', el => el.href);
    const expectedUrl = 'https://www.unocha.org/ocha-digital-services';
    await expect(seeAllButtonHref).toEqual(expectedUrl);
  });

  it('should contain no links in the Related Platforms section which have default text', async () => {
    const relatedPlatformsText = await page.$eval('.cd-ocha-dropdown__section:first-child .cd-ocha-dropdown__link a', el => el.innerHTML);
    await expect(relatedPlatformsText).not.toMatch('Customizable');
  });
});
