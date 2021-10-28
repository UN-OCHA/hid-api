# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [5.0.1](https://github.com/UN-OCHA/hid_api/compare/v5.0.0...v5.0.1) (2021-10-28)


### Bug Fixes

* **security:** only destroy session after password reset succeeds ([0d30eea](https://github.com/UN-OCHA/hid_api/commit/0d30eea40ccb7ea199cdfffea58b0582c6313d7e))

## [4.0.0](https://github.com/UN-OCHA/hid_api/compare/v4.0.0-rc1...v4.0.0) (2021-09-16)

## [5.0.0](https://github.com/UN-OCHA/hid_api/compare/v4.0.0-rc1...v5.0.0) (2021-10-20)


### ⚠ BREAKING CHANGES

* **auth:** the OAuth clients in the removed code might experience
adverse affects. However, HID logs do not show any usage of the
currentClient param being sent with requests, so the impact is expected
to be very low.

Refs: HID-2192
* removed PUT /api/v3/user/emails/{email}
* /api/v3/user/password no longer exists

### Features

* adopt standard-version to generate CHANGELOG ([d9706b4](https://github.com/UN-OCHA/hid_api/commit/d9706b4163d5c3fde4c5c97ec6a11696aed7a22a))
* password visibility toggle on all password inputs ([4e8977e](https://github.com/UN-OCHA/hid_api/commit/4e8977ec86ffecd5c50160e3143439467683e0a1))
* remove commands/emails/functions to send password expiry emails ([a198d89](https://github.com/UN-OCHA/hid_api/commit/a198d89c84aa513f6b2fb87c7c0b4f36a7faf1c8))
* **security:** check historical passwords during email-based password resets ([4ef847c](https://github.com/UN-OCHA/hid_api/commit/4ef847c846657c20226fdfb7f83b88f6d946413e))
* **security:** comply with 2021 OICT password strength guidance ([2102a1a](https://github.com/UN-OCHA/hid_api/commit/2102a1ac7e9a4d870a43aeb58eeec95f6d75092b))
* **security:** store 5 previous password hashes and prevent their re-use ([65ff556](https://github.com/UN-OCHA/hid_api/commit/65ff556fb833d41d6b1d725f89441f5c1bbbb909))
* **security:** store old passwords when using password-reset as well ([43da48f](https://github.com/UN-OCHA/hid_api/commit/43da48fe6971aea1cf8229e50aa5d4342bfc4a81))


### Bug Fixes

* add hyphen to password regexes ([1c3d8b6](https://github.com/UN-OCHA/hid_api/commit/1c3d8b662bf6eab2f025e36569320b59816ff08c))
* any emailId lookup should be lowercased ([f32bbf4](https://github.com/UN-OCHA/hid_api/commit/f32bbf417262e511f919ad27391ea927b458f8e1))
* **auth:** make sure JWT requests don't 500 ([73666a9](https://github.com/UN-OCHA/hid_api/commit/73666a9305cc87bf7b7ac32bb5f8518e1b257cb4))
* **auth:** safely clone data and output oauth.client_id when logging /account.json ([5175677](https://github.com/UN-OCHA/hid_api/commit/517567753fb420be597f1fe512e130fe4e444208))
* ensure that emailId never gets set to undefined ([3ef4a9a](https://github.com/UN-OCHA/hid_api/commit/3ef4a9af665f587c29fafe344fc8d03c8ff94fd3))
* escape HTML in password-regex include ([98034aa](https://github.com/UN-OCHA/hid_api/commit/98034aa3e1614b6d58615308183ebf179fd28eab))
* escape HTML in password-requirements include ([d925482](https://github.com/UN-OCHA/hid_api/commit/d9254821befdf776efbebc1021430f1443cd2f64))
* force user input to lowercase when sending password reset emails ([c89e1e4](https://github.com/UN-OCHA/hid_api/commit/c89e1e4bd34462a436ee28fff6e1d3dc32002778))
* on TOTP form, checkbox to remember device now has a label ([ef8f528](https://github.com/UN-OCHA/hid_api/commit/ef8f528aa96661a794affeffebf831637fe5e743))
* provide migration to drop expiry-related fields from all users ([7becb5f](https://github.com/UN-OCHA/hid_api/commit/7becb5fe0529a26617cd50b2da7b18e6b7ff05ee))
* purge new_password URL/template from codebase ([992116b](https://github.com/UN-OCHA/hid_api/commit/992116b278938bb42ea85963671235ad004a73e4))
* registration form client-side JS now wotks with CSP ([43a1ec9](https://github.com/UN-OCHA/hid_api/commit/43a1ec9c20df0b68aa6666137873a8ca73474fc8))
* remove password expiry check from login process ([447eabe](https://github.com/UN-OCHA/hid_api/commit/447eabea13de968c25acfb768340e6206aa6f409))
* **security:** destroy session when password reset is attempted ([4591c7b](https://github.com/UN-OCHA/hid_api/commit/4591c7bef73ffa799d7ae3d6bee7366025df5642))
* store time of last password reset when using logged-in settings form ([516087b](https://github.com/UN-OCHA/hid_api/commit/516087b057d5becad65e9b5c35afe0677f4514f6))
* wait to save user record until after verifying email during PW reset ([a5f4c10](https://github.com/UN-OCHA/hid_api/commit/a5f4c10ff5b27917676e69879714d43491a0dc66))
* when verifying an account, store success message in a new object ([7bdbe62](https://github.com/UN-OCHA/hid_api/commit/7bdbe6264e569313d68aafefcf1a2bfcfc0df03a))


* HID-2064: split UserController.validateEmail into two functions ([1333be2](https://github.com/UN-OCHA/hid_api/commit/1333be2b6d6343dde521338bca5f5aebb32d53bd))
* HID-2067: split resetPasswordEndpoint into two endpoints ([12b731b](https://github.com/UN-OCHA/hid_api/commit/12b731b89b5f418661b69f2825f42189573dc6b0))
* **auth:** remove special cases from /account.json ([b1487ff](https://github.com/UN-OCHA/hid_api/commit/b1487ff42c34657b4f373a351e5f5fb42cc702cb))
