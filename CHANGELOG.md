# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [5.1.8](https://github.com/UN-OCHA/hid-api/compare/v5.1.7...v5.1.8) (2022-09-22)


### Bug Fixes

* correct paths for alert include within settings pages ([fb5dd80](https://github.com/UN-OCHA/hid-api/commit/fb5dd80ad4d84c8e2c53a6f8905386dd8441448a))
* update tracking code to use GTM/GA4 ([1be35f2](https://github.com/UN-OCHA/hid-api/commit/1be35f2a8a945b98524b1c64c44f9e8fd3d0b651))
* Use the shared build action with tagging, notifications and pushing. ([fabb069](https://github.com/UN-OCHA/hid-api/commit/fabb0697a9df84dc08c5af0c28923f61d190c0c4))

### [5.1.7](https://github.com/UN-OCHA/hid-api/compare/v5.1.6...v5.1.7) (2022-07-28)


### Bug Fixes

* **security:** security updates to dependencies ([aef65eb](https://github.com/UN-OCHA/hid-api/commit/aef65eb60d8631c56816e691b8af96374a1da6e7))

### [5.1.6](https://github.com/UN-OCHA/hid-api/compare/v5.1.5...v5.1.6) (2022-06-30)


### Bug Fixes

* update packages for security ([e309d09](https://github.com/UN-OCHA/hid-api/commit/e309d096df2e9ed8bff8697b0521c45907c5dc09))

### [5.1.5](https://github.com/UN-OCHA/hid-api/compare/v5.1.4...v5.1.5) (2022-06-02)

### Bug Fixes

* **security:** Update EJS and other dependabot updates

### [5.1.4](https://github.com/UN-OCHA/hid-api/compare/v5.1.3...v5.1.4) (2022-05-03)

### Bug Fixes

* **security:** dependabot updates, nodejs update

### [5.1.3](https://github.com/UN-OCHA/hid-api/compare/v5.1.2...v5.1.3) (2022-04-07)


### Bug Fixes

* security: updates to dependencies
* prevent errors during OAuth dialog confirmations ([c98b59f](https://github.com/UN-OCHA/hid-api/commit/c98b59fdf0ecebb89a233c967b0c900974108c1f))

## [5.1.2](https://github.com/UN-OCHA/hid-api/compare/v5.1.1...v5.1.2) (2022-02-04)


### Bug Fixes

* **logs:** supply correct client_id value when generating OAuth tokens ([289f06a](https://github.com/UN-OCHA/hid-api/commit/289f06a455d509d183e3ce6ee9e9004fd98e503d))
* **ux:** when displaying user-friendly registration errors, parse for new error strings ([33334b1](https://github.com/UN-OCHA/hid-api/commit/33334b1b7b4cfa786ed4f708eab69781fdbb70ab))

## [5.1.1](https://github.com/UN-OCHA/hid-api/compare/v5.1.0...v5.1.1) (2022-01-13)


### Bug Fixes

* adjust copy of french emails ([81cf9ce](https://github.com/UN-OCHA/hid-api/commit/81cf9ce442f12745074a0cbbeaed60ddab0b5967))
* adjust copy of french emails again ([9832d35](https://github.com/UN-OCHA/hid-api/commit/9832d35321d17fa33b42f9d4e7622c96834ff1d4))
* create users with minimal attributes ([c57d9af](https://github.com/UN-OCHA/hid-api/commit/c57d9afc10eb943794e649644220c65d0879669d))
* drop mentions of info@hid and provide registration link in admin_delete email ([ad867fa](https://github.com/UN-OCHA/hid-api/commit/ad867fa8db5a4269df0a004ea66c181462c165b1))
* drop obsolete HID Contacts notify method ([53b26b7](https://github.com/UN-OCHA/hid-api/commit/53b26b7ce2e20caac29d8444b4d7dcdee839863d))
* drop obsolete property User.createdBy ([18f5a7c](https://github.com/UN-OCHA/hid-api/commit/18f5a7cfd87d14e019e5c8e39ee3113aff8a51f6))
* implement UserPolicy.canDestroy as policy for UserController.destroy ([842dd35](https://github.com/UN-OCHA/hid-api/commit/842dd355e3904e0f92b7e7fa9f6c32fbb4843e81))
* log more events and metadata ([e397dd9](https://github.com/UN-OCHA/hid-api/commit/e397dd98029ad8e193ac43d5485097e77b901e98))
* log something when we issue OAuth/JWT tokens ([8c7f91d](https://github.com/UN-OCHA/hid-api/commit/8c7f91d9786ae0aab59d1cc301a25a2e604b36f0))
* make User.isStrongDictionary static in order to use it when creating users ([f4f0060](https://github.com/UN-OCHA/hid-api/commit/f4f006094368122c792baa4d768f270062325553))
* migration to drop User.createdBy field ([2d4d43b](https://github.com/UN-OCHA/hid-api/commit/2d4d43b084c69e7241d1264f1c81013cc15ff484))
* really really fix AuthPolicy setup ([db19788](https://github.com/UN-OCHA/hid-api/commit/db19788e5fed747f228a32a620d0b244c7866256))
* remove all Notifications templates ([04aceb2](https://github.com/UN-OCHA/hid-api/commit/04aceb29c0c9ea03b711bb651ae7a424e2848dc8))
* remove app_verify_url from UserController.create ([714dcf1](https://github.com/UN-OCHA/hid-api/commit/714dcf10927712f628987ea5d994fbe8e528369a))
* remove HID Contacts code from UserPolicy.canDestroy ([aa308e8](https://github.com/UN-OCHA/hid-api/commit/aa308e860d958d4283a23c4c8c4b13c6b562a108))
* remove special-casing for IASC tokens ([9ace65b](https://github.com/UN-OCHA/hid-api/commit/9ace65ba78d0fbd66d1b8ec25b1f610430585dda))
* require family/given names when creating users via API ([662b703](https://github.com/UN-OCHA/hid-api/commit/662b703c49bf34a5326fc774347ca46d38fcd559))
* restore 2FA to admin actions that require it ([30aace2](https://github.com/UN-OCHA/hid-api/commit/30aace2f65cb051d9288081b739c9205b047d23f))
* use a dedicated email notification for deleting unverified accounts ([7df4ad6](https://github.com/UN-OCHA/hid-api/commit/7df4ad66079c3d4549743172d36539c80e6c5464))
* validate email when creating users via API call ([d596e30](https://github.com/UN-OCHA/hid-api/commit/d596e30de344420a8e1d5952bf2ea5ddb8f91792))

## [5.1.0](https://github.com/UN-OCHA/hid-api/compare/v5.0.0...v5.1.0) (2021-11-18)


### Features

* **auth:** confirmed recovery email addresses can be used to login ([dcb51c9](https://github.com/UN-OCHA/hid-api/commit/dcb51c96a4d5bf11207a6f5b89e088669670fa32))
* **security:** passwords must now pass a dictionary test in addition to all existing requirements ([5b8fdae](https://github.com/UN-OCHA/hid-api/commit/5b8fdae6d46cf7ef81236b5c956e0744d8e00d16))


### Bug Fixes

* **email:** clarify email notification when adding recovery address to profile ([ee502b2](https://github.com/UN-OCHA/hid-api/commit/ee502b268221ecbb2f57bb1b43672519dfd57b1d))
* **email:** fix footer inclusion in FR alert email ([13d25f8](https://github.com/UN-OCHA/hid-api/commit/13d25f83027e72cf65573e8fde12c659a23d9560))
* **email:** make EN template closure more consistent ([aa1bb41](https://github.com/UN-OCHA/hid-api/commit/aa1bb417f18d818b2394f8adb151802cae60a8a6))
* **email:** remove CTA for email support from email_alert ([c0dfaa0](https://github.com/UN-OCHA/hid-api/commit/c0dfaa0eda0c5b5d188b02383f8dcfc68fcae10b))
* **email:** remove CTA for email support from reset_password ([6bdd0ea](https://github.com/UN-OCHA/hid-api/commit/6bdd0ea61879ca9e817e3d53c9deac8420197c0a))
* **email:** remove email wording related to HID Contacts ([af8905e](https://github.com/UN-OCHA/hid-api/commit/af8905e2a4b035ba37ee15b796c5e68a6da5a687))
* **email:** remove legacy command and email template special_password_reset ([5433630](https://github.com/UN-OCHA/hid-api/commit/54336306af48b08d119f47a7b414b1b1102dca2f))
* **email:** remove legacy email template verification_expiry ([d3787ca](https://github.com/UN-OCHA/hid-api/commit/d3787ca2b072239d0ac58985d4a442b84c8f90f0))
* **email:** update EN/FR email footers to remove email and add FAQs ([a7e7da8](https://github.com/UN-OCHA/hid-api/commit/a7e7da8a84653d89f1027a9fa57c6787ae72ab21))
* **email:** update wording in FR templates and make introduction and closure more consistent ([de0d806](https://github.com/UN-OCHA/hid-api/commit/de0d80671ad197ea159e64c41308ca6a3c7ff065))
* log password update/reset errors with consistent metadata ([70f8769](https://github.com/UN-OCHA/hid-api/commit/70f8769a327a1d71cb0f2af69e2e96fbae599e9d))
* point users to FAQs for common errors ([7824e8e](https://github.com/UN-OCHA/hid-api/commit/7824e8e2af4080ec8436edc8531c7e1ec713c8d5))
* provide more specific error when password did not meet guidelines ([6a0ede6](https://github.com/UN-OCHA/hid-api/commit/6a0ede640195b082dba6b74f4d31d584ed5554c8))
* **security:** do explicit case-insensitive string matching before passing to cracklib ([f4141da](https://github.com/UN-OCHA/hid-api/commit/f4141da985aab8c3c597854c90774fcd4bc8da63))
* **security:** isStrongDictionary auto-compares email, and logs feedback when present ([9689e8b](https://github.com/UN-OCHA/hid-api/commit/9689e8b4136acd25158069c3127d94d4b4d7384c))
* **security:** isStrongDictionary compares password to family, given, and each email address ([3b83d60](https://github.com/UN-OCHA/hid-api/commit/3b83d60180b784a2a6f2c0f0b8fd26b3f45bc811))
* **security:** only destroy session after password reset succeeds ([0d30eea](https://github.com/UN-OCHA/hid-api/commit/0d30eea40ccb7ea199cdfffea58b0582c6313d7e))
* **security:** only destroy session after password reset succeeds ([f1db7c9](https://github.com/UN-OCHA/hid-api/commit/f1db7c9151b7235c2fe095de7d2e89b703c0c952))
* **theme:** update CD and implement Header nav ([02e984e](https://github.com/UN-OCHA/hid-api/commit/02e984e63b9479f9f2d8f23927853fe2e0617aad))
* upgrade qrcode and underlying dependencies ([50a4bb8](https://github.com/UN-OCHA/hid-api/commit/50a4bb807b05b78b1114746a11ec4f8d3e6c0ed3))
* when password requirements are not met during password reset, show form again ([80803bf](https://github.com/UN-OCHA/hid-api/commit/80803bf427bc6d1d0a1d520b3ff99dd558d15f0c))

## [5.0.1](https://github.com/UN-OCHA/hid_api/compare/v5.0.0...v5.0.1) (2021-10-28)


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
