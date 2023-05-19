# Contributing Guidelines

| Audience |
| :------- |
| Everyone |

This file contains some instructions for installing, developing for, and preparing releases for the Shared Snap Service. Each section is marked with an Audience to help you decide whether the docs are for your current task.

- [Commit messages](#commit-messages)
- [Installation / Setup](#installation--setup)
- [Development on OCHA infra](#development-on-ocha-infra)
  - [HID environments](#hid-environments)
  - [Authenticating with API](#authenticating-with-api)
- [Local development](#local-development)
  - [Testing Emails](#testing-emails)
  - [Logging](#logging)
  - [API Docs](#api-docs)
  - [Using API methods in Auth](#using-api-methods-in-auth)
  - [E2E testing](#e2e-testing)
- [Creating Releases](#creating-releases)


## Commit messages

| Audience     |
| :----------- |
| Contributors |

As of `v4.0.0` we are using [standard-version](https://github.com/conventional-changelog/standard-version#standard-version) to generate a `CHANGELOG.md` for each release. This automation is only possible if our commits follow the [Conventional Commits 1.0.0 specification](https://www.conventionalcommits.org/en/v1.0.0/).

Here are a few brief examples:

```sh
#
# All examples assume you're on version 4.0.0 when creating the example commit.
#

# a normal bugfix
# Outcome: new patch version (4.0.1)
git cm -m "fix: remove typo from password reset error message"

# a new feature that relates to "auth"
# Outcome: new minor version (4.1.0)
git cm -m "feat(auth): allow new scope 'photo' when fetching account.json"

# a bugfix that creates a breaking change
# Outcome: new major version (5.0.0)
git cm -m "fix!: remove legacy special-cases from account.json

Refs: HID-XXXX
BREAKING CHANGE: we had some special cases which reformatted fundamental 
properties based on the client requesting the user's data. Our logs show this 
is no longer in use so we're dropping the special cases to enforce consistency"

```

# Installation / Setup

| Audience     |
| :----------- |
| Contributors |

The best way to set up HID is by using the [`hid-stack` repo][hid-stack-install] and following instructions there.

  [hid-stack-install]: https://github.com/UN-OCHA/hid-stack/#installation--first-time-setup

## Development on OCHA Infra

### HID environments

| Audience          |
| :---------------- |
| HID Auth Partners |

The [HID API wiki](https://github.com/UN-OCHA/hid-api/wiki/The-HID-environments) contains up-to-date information on various environments for testing the API or Authentication features.


### Authenticating with API

| Audience                    |
| :-------------------------- |
| HID Authentication Partners |

To generate a JSON Web Token, you'll need to have a **valid, active password** for the environment you want to test. See the "Testing different environments" section to find the correct environment. Especially when working on HID for the first time (or after a long time) you'll have to reset your HID password.

Then use the Swagger docs to construct a request (or format your own using cURL, Insomnia, PostMan, etc):

https://api.humanitarian.id/docs/#!/auth/post_jsonwebtoken


## Local development

### Testing Emails

| Audience                        |
| :------------------------------ |
| Contributors, HID Auth Partners |

HID is reliant on email notifications for several critical aspects of its function. You may find yourself needing to send or check for the reception of emails while doing development and testing.

If you followed the instructions in the [`hid-stack` repo][hid-stack-install], then Mailhog should be available on your host machine at http://localhost:8025

For dev/stage environments, refer to the [OCHA Developer Handbook regarding use of Mailhog](https://docs.google.com/document/d/1j5QkW_yTA4efqIq40wuRqyvLecbVkOZwwOumZoN4qxI/edit#heading=h.5koxy8t2dww)


### Logging

| Audience     |
| :----------- |
| Contributors |

We strive to log all transactions and errors since HID is a shared piece of infrastructure employed by dozens of websites. In most any file, there is a `logger` function available for you to use.

```js
// Logging successful operations (INFO)
logger.info(
  'Primary log message goes here.',
  {
    request,
    security: true,
    // anything else goes here
  }
);

// Logging failed operations (WARN)
logger.warn(
  'Primary log message goes here.',
  {
    request,
    security: true,
    fail: true,
    // anything else goes here
  }
);


// Logging errors (ERROR)
// Assuming we're in a catch block with a node.js error assigned to `err`
catch(err) {
  logger.error(
    err.message,
    {
      request,
      security: true,
      fail: true,
      stack_trace: err.stack,
    }
  );
};
```

The general format of a log is described in the code block. Each component is explained here:

- The first string is the primary message. It will appear in ELK as `hid.message` — Please keep this string **generic** and **free of variables**. Although our codebase does not yet strictly follow this convention, it is something we would like to achieve long-term.
- The `request` object should be included in its entirety, except when sensitive information is included. We should not expect each individual logging call to sanitize. If there is something sensitive that _could_ be included (such as payload data) then edit the shared log formatter to detect and sanitize any such instance of the data. See `/config/logs.js` to edit the log formatter. It's shared by all environments so your logs will remain consistent no matter where you deploy.
- OICT requirement: `security: true` should be included when the operation involves authentication of a user — logging in, logging out, changing primary emails, adding or removing emails, enable/disable 2FA, and so forth. If the operation isn't security related, omit the `security` property instead of setting to `false`.
- OICT requirement: `fail: true` when the operation represents a failure to achieve the intended goal, such as logging in. A request that contains an invalid password for the user is both `security: true` and `fail: true`. Like `security`, just omit this property when the value isn't `true`
- When writing a migration (typically a file in the `commands` directory) include `migration: true` in the log objects for any type: info, warn, error.
- The remaining arguments you supply should appear alphabetically. They should use `snake_case`. Some common ones are `oauth` (object), `user` (object), and for errors we always include `stack_trace`.
- Finally, our linter will complain if your variable is the same name as the JSON property. That's why `request` is using shorthand instead of being written as `request: request`


## API Docs

| Audience     |
| :----------- |
| Contributors |

We use `swagger-inline` to provide docblocks alongside each function. Look for comments with markings like the following:

```js
/*
 * @api [get] /route/path
 * summary: 'Example method description'
 * responses:
 *   '200':
 *      description: Sample response description for HTTP 200
 */
```

For more info please reference the [official example](https://github.com/readmeio/swagger-inline#examples) and the [official documentation](https://swagger.io/docs/specification/about/) for `swagger-inline`


## Using API methods in Auth

| Audience     |
| :----------- |
| Contributors |

HID API contains functions to administer all of HID. If you have sufficient permissions, you can do everything via cURL or your favorite HTTP client, including user management, OAuth Client management, and so forth.

HID Auth is the portion which serves some HTML/CSS in order to allow OAuth users to manage their profile and OAuth authorizations. It is designed to be as lightweight and simple as possible, since an average HID session may only last a few seconds (provided they have an active session and are only wanting to autorize a new website).

In order to reduce code duplication, many API functions now have a second argument available to them called `internalArgs` which allows the HID Auth pages to take advantage of those same functions via simple HTML form submissions that get handled server-side, instead of requiring a client-side JS framework to fire all the API calls.

If you see a function that doesn't yet have `internalArgs`, feel free to add it by following the exact same conventions from an existing function.


## E2E testing

| Audience     |
| :----------- |
| Contributors |

We do have a few tests to make local development and PR review easier. They do not yet run on our CI infra, but it's the end-goal.

To set up the testing, copy the example config to make a local "environment" for Puppeteer:

```sh
cp _tests/e2e/_env/example.js _tests/e2e/_env/local.js
```

Once created, you will have to populate the data to match your local database. Don't worry about getting it all correct. For example there is not yet any test to use the OAuth config. You can safely ignore it as of Mar 2021.

```sh
# Install dependencies for your host machine.
npm i

# Run all E2E tests in headless mode. The console will output the results.
npm run e2e

# See the tests run in a visible browser window with --debug
npm run e2e -- --debug

# If you want to run a limited number of tests, specify a string with the -t
# argument. It will parse all of the describe() blocks and only run tests when
# it matches the string you supply.
npm run e2e -- -t 'Login'

# Some of our Tests could run on CI and some are too "human" for various reasons
# such as needing to open Mailhog tabs and the like. Since the no-CI are the
# exception rather than the rule, our convention is to put "no-ci" in any
# describe() block which should NOT run in Travis, rather than marking all of
# the CI-friendly tests.
#
# Note: you can also put no-ci in one specific test (i.e. the it() block which
# contains the specific test assetion sentence), but using the top-level
# describe() block in a particular file will exclude that whole file.
#
# @see _tests/e2e/PasswordReset.test.js
npm run e2e -- -t '^(?!.*no-ci).*$'
```

Sometimes it might be convenient to attach a special class to an element in order to make it quickly selectable within Puppeteer. If you do that, make sure to prefix with `t-` so we can distinguish as a testing-only class:

```css
/* a button we want to press */
.t-btn--login {}

/* a top-level page class for the user dashboard */
.t-page--dashboard {}
```

There is a file `_tests/e2e/_utils.js` which has some common macros that you might find helpful while writing tests. Feel free to add more. Some of them, such as `clearMailhog` might be disruptive to other tests, so be careful about how they are used. If in doubt, use the `--runInBand` flag to ensure that they run in series instead of in parallel.


## Creating Releases

| Audience    |
| :---------- |
| Maintainers |

We have a regular release schedule for HID to ensure that security updates are shipped in a timely manner. See our [HID Standard Operating Procedure][hid-sop] for the details about our release schedule. The rest of this section provides technical guidance for creating Releases.

  [hid-sop]: https://docs.google.com/document/d/1GHjofGe5VZhJjKJnauNKDmhbP4o-NY2h9cH9N_EyvR0/edit#heading=h.3t9e3dv1ao2z

Create a new branch from `dev` and run the release command to generate the new CHANGELOG and increment the version number in our `package.json` and other related files. There's a dry-run flag to preview what will happen:

```sh
# Example with the dry-run flag.
$ npm run release -- --dry-run

> hid-api@3.0.0 release
> standard-version "--dry-run"

✔ bumping version in package.json from 3.0.0 to 3.0.1
✔ bumping version in package-lock.json from 3.0.0 to 3.0.1
✔ outputting changes to CHANGELOG.md
```

The command to make a release contains no flags:

```sh
$ npm run release
```

Review the commit and make any necessary adjustments to the CHANGELOG, using `git commit --amend` to add your changes to the existing commit that `standard-version` just created. Push your branch and open a PR to `dev`, which you can merge without review.

[Create the new Release][new-release] using the GitHub UI with the following properties:

- **Tag:** new tag with format `v0.0.0` — numbers should match [`package.json` in the `dev` branch][dev-package].
- **Target branch:** `dev`
- **Title:** `Production YYYY-MM-DD` using the PROD date (check the OPS calendar! it's normally two weeks from the STAGE release but may vary)
- **Release notes:** Copy the new CHANGELOG bullets. If dependabot made any updates during this cycle, you can include "regular security updates" without being specific.

Once the tagged Release has been created, [create a PR from `dev` to `main`][pr-dev-main] which will include all work within the tagged release. You can merge that without review as well. This step allows hotfixes to be created from `main` should the need arise.

  [new-release]: https://github.com/UN-OCHA/hid-api/releases/new?target=dev
  [dev-package]: https://github.com/UN-OCHA/hid-api/blob/dev/package.json#L3
  [pr-dev-main]: https://github.com/UN-OCHA/hid-api/compare/main...dev


## CD Upgrades

Since HID doesn't use Drupal, a few manual tasks are required to update certain files during CD upgrades.


### CSS needs to be aggregated manually in a build-step

The CD CSS is now split into various components that allow for custom builds yielding smaller overall filesizes when implemented on different websites.

To aggregate the files we use on HID, there is a new npm command to concatenate and minify the contents of `assets/css/hid.css`:

```sh
npm run css
```

Save the updated `hid.min.css` file to version control.


### JS files need to be modified and initialized differently

Don't sweat it, the bulk of the file doesn't need to change! With a few simple steps you can use the original Drupal JS files:

  1. Remove the outer closure `(function (Drupal) {` and `})(Drupal);` from the top and bottom of the file respectively.
  2. Modify the Behavior to be a global constant instead of a property inside the `Drupal.behaviors` object: `const cdDropdown = {`
  3. Create a new IIFE at the bottom of the file with the modified behavior's `attach` so that it runs when the file is parsed: `(function iife() {cdDropdown.attach();}());`

Compare two existing files for a full example:

- Drupal original: `/assets/css/cd-dropdown/cd-dropdown.js`
- Modified for HID: `/assets/js/vendor/cd-dropdown.js`
