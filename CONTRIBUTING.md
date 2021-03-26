# Installation / Setup

The complete [HID Developer onboarding documentation
](https://docs.google.com/document/d/1h3MX_ay7EyFr62dyhvdSXAOP2g4ho3j7m3KNdG8ZFxE/edit) can be found in Google docs. This file covers one-time technical setup notes. You should only need these notes when onboarding, or setting up the repo on a new computer.

## Development on OCHA Infra

### Testing different environments

The [HID API wiki](https://github.com/UN-OCHA/hid_api/wiki/The-HID-environments) contains up-to-date information on various environments for testing the API or client-side app.


### Authenticating with Dev/Stage/Live

To generate a JSON Web Token, you'll need to have a **valid, active password** for the environment you want to test. See the "Testing different environments" section to find the correct environment. Especially when working on HID for the first time (or after a long time) you'll have to reset your HID password.

Then use the Swagger docs to construct a request (or format your own using cURL, Insomnia, PostMan, etc):

https://api.dev.humanitarian.id/docs/#!/auth/post_jsonwebtoken

Sometimes development requires authenticating with various roles or permissions. **Contact Marina** to get access to the document which contains credentials for accounts with various roles (and thus the ability to authenticate with a different token).

## Local development

### Downloading DB Snapshots

The `hid-stack` repo has the most up-to-date instructions for importing DB snapshots. Please follow the setup instructionsin the stack.


### Sending/Receiving Test Emails

HID is reliant on email notifications for several critical aspects of its function. You may find yourself needing to send or check for the reception of emails while doing development and testing.

Refer to the [OCHA Developer Handbook regarding use of Mailhog](https://docs.google.com/document/d/1j5QkW_yTA4efqIq40wuRqyvLecbVkOZwwOumZoN4qxI/edit#heading=h.5koxy8t2dww)


### Logging

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
catch(err => {
  logger.error(
    err.message,
    {
      request,
      security: true,
      fail: true,
      stack_trace: err.stack,
    }
  );
});
```

The general format of a log is described in the code block. Each component is explained here:

- The first string is the primary message. It will appear in ELK as `json.message` — Please keep this string **generic** and **free of variables**. Although our codebase does not yet strictly follow this convention, it is something we would like to achieve long-term.
- The `request` object should be included in its entirety, except when sensitive information is included. We should not expect each individual logging call to sanitize. If there is something sensitive that _could_ be included (such as payload data) then edit the shared log formatter to detect and sanitize any such instance of the data. See `/config/logs.js` to edit the log formatter. It's shared by all environments so your logs will remain consistent no matter where you deploy.
- OICT requirement: `security: true` should be included when the operation involves authentication of a user — logging in, logging out, changing primary emails, adding or removing emails, enable/disable 2FA, and so forth. If the operation isn't security related, omit the `security` property instead of setting to `false`.
- OICT requirement: `fail: true` when the operation represents a failure to achieve the intended goal, such as logging in. A request that contains an invalid password for the user is both `security: true` and `fail: true`. Like `security`, just omit this property when the value isn't `true`
- When writing a migration (typically a file in the `commands` directory) include `migration: true` in the log objects for any type: info, warn, error.
- The remaining arguments you supply should appear alphabetically. They should use `snake_case`. Some common ones are `oauth` (object), `user` (object), and for errors we always include `stack_trace`.
- Finally, our linter will complain if your variable is the same name as the JSON property. That's why `request` is using shorthand instead of being written as `request: request`


## Swagger API Docs

### Docs v3

For v3 we are transitioning away from the global `specs.yml` file and instead using `swagger-inline` to provide docblocks alongside each function. Look for comments with markings like the following:

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


## Using `internalArgs` to glue API and Auth together

HID API contains functions to administer all of HID. If you have sufficient permissions, you can do everything via cURL or your favorite HTTP client, including user management, OAuth Client management, and so forth.

HID Auth is the portion which serves some HTML/CSS in order to allow OAuth users to manage their profile and OAuth authorizations. It is designed to be as lightweight and simple as possible, since an average HID session may only last a few seconds (provided they have an active session and are only wanting to autorize a new website).

In order to reduce code duplication, many API functions now have a second argument available to them called `internalArgs` which allows the HID Auth pages to take advantage of those same functions via simple HTML form submissions that get handled server-side, instead of requiring a client-side JS framework to fire all the API calls.

If you see a function that doesn't yet have `internalArgs`, feel free to add it by following the exact same conventions from an existing function.


## E2E testing

We do have a few tests to make local development and PR review easier. They do not yet run on our CI infra, but it's the end-goal.

To set up the testing, copy the example config to make a local "environment" for Puppeteer:

```sh
cp _tests/e2e/env/example.js _tests/e2e/env/local.js
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
npm run e2e -- -t '/login'
```
