

const Boom = require('boom');
const qs = require('qs');
const ejs = require('ejs');
const axios = require('axios');
const moment = require('moment');
const acceptLanguage = require('accept-language');
const sharp = require('sharp');
const validator = require('validator');

const hidAccount = '5b2128e754a0d6046d6c69f2';
const List = require('../models/List');
const User = require('../models/User');
const OutlookService = require('../services/OutlookService');
const EmailService = require('../services/EmailService');
const HelperService = require('../services/HelperService');
const NotificationService = require('../services/NotificationService');
const GSSSyncService = require('../services/GSSSyncService');
const AuthPolicy = require('../policies/AuthPolicy');
const ListUserController = require('./ListUserController');
const config = require('../../config/env')[process.env.NODE_ENV];

const { logger } = config;

/**
 * @module UserController
 * @description Generated Trails.js Controller.
 */

async function _pdfExport(users, number, lists, req, format) {
  const filters = [];
  if (Object.prototype.hasOwnProperty.call(req.query, 'name') && req.query.name.length) {
    filters.push(req.query.name);
  }
  if (Object.prototype.hasOwnProperty.call(req.query, 'verified') && req.query.verified) {
    filters.push('Verified User');
  }
  if (Object.prototype.hasOwnProperty.call(req.query, 'is_admin') && req.query.is_admin) {
    filters.push('Administrator');
  }
  lists.forEach((list, index) => {
    if (index > 0) {
      filters.push(list.name);
    }
  });

  const data = {
    lists,
    number,
    users,
    dateGenerated: moment().format('LL'),
    filters,
  };
  let template = 'templates/pdf/printList.html';
  if (format === 'meeting-compact') {
    template = 'templates/pdf/printMeetingCompact.html';
  } else if (format === 'meeting-comfortable') {
    template = 'templates/pdf/printMeetingComfortable.html';
  }
  const str = await ejs.renderFile(template, data, {});

  // Send the HTML to the wkhtmltopdf service to generate a PDF, and
  // return the output.
  const postData = qs.stringify({ html: str });
  const hostname = process.env.WKHTMLTOPDF_HOST;
  const port = process.env.WKHTMLTOPDF_PORT || 80;
  const params = {
    service: 'hid_api',
    pdfLandscape: true,
    pdfBackground: true,
    pdfMarginUnit: 'mm',
    pdfMarginTop: 10,
    pdfMarginBottom: 10,
    pdfMarginRight: 10,
    pdfMarginLeft: 10,
    scale: 1,
  };
  const clientRes = await axios({
    method: 'post',
    url: `http://${hostname}:${port}/snap`,
    params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': postData.length,
      'X-Forwarded-For': req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      'User-Agent': req.headers['user-agent'],
    },
    data: postData,
    responseType: 'arraybuffer',
  });
  if (clientRes && clientRes.status === 200) {
    // clientRes.setEncoding('binary');

    const pdfSize = parseInt(clientRes.headers['content-length'], 10);

    return [clientRes.data, pdfSize];
  }

  throw new Error(`An error occurred while generating PDF for list ${data.lists[0].name}`);
}

function _txtExport(users) {
  let out = '';
  for (let i = 0; i < users.length; i += 1) {
    out += `${users[i].name} <${users[i].email}>;`;
  }
  return out;
}

function getBundles(user) {
  let bundles = '';
  user.bundles.forEach((bundle) => {
    if (!bundle.deleted) {
      bundles += `${bundle.name};`;
    }
  });
  return bundles;
}

function getRoles(user) {
  let roles = '';
  user.functional_roles.forEach((role) => {
    if (!role.deleted) {
      roles += `${role.name};`;
    }
  });
  return roles;
}

function _csvExport(users, full = false) {
  let out = 'Given Name,Family Name,Job Title,Organization,Groups,Roles,Country,Admin Area,Phone,Skype,Email,Notes\n';
  let org = '';
  let bundles = '';
  let roles = '';
  let country = '';
  let region = '';
  let jobTitle = '';
  let phoneNumber = '';
  let skype = '';
  let status = '';
  let orphan = '';
  let ghost = '';
  let verified = '';
  let manager = '';
  let admin = '';
  if (full) {
    out = 'Given Name,Family Name,Job Title,Organization,Groups,Roles,Country,Admin Area,Phone,Skype,Email,Notes,Created At,Updated At,Orphan,Ghost,Verified,Manager,Admin\n';
  }
  for (let i = 0; i < users.length; i += 1) {
    org = '';
    bundles = '';
    country = '';
    region = '';
    skype = '';
    roles = '';
    jobTitle = users[i].job_title || ' ';
    phoneNumber = users[i].phone_number || ' ';
    status = users[i].status || ' ';
    if (users[i].organization && users[i].organization.list) {
      org = users[i].organization.name;
    }
    if (users[i].bundles && users[i].bundles.length) {
      bundles = getBundles(users[i]);
    }
    if (users[i].functional_roles && users[i].functional_roles.length) {
      roles = getRoles(users[i]);
    }
    if (users[i].location && users[i].location.country) {
      country = users[i].location.country.name;
    }
    if (users[i].location && users[i].location.region) {
      region = users[i].location.region.name;
    }
    if (users[i].voips.length) {
      for (let j = 0; j < users[i].voips.length; j += 1) {
        if (users[i].voips[j].type === 'Skype') {
          skype = users[i].voips[j].username;
        }
      }
    }
    orphan = users[i].is_orphan ? '1' : '0';
    ghost = users[i].is_ghost ? '1' : '0';
    verified = users[i].verified ? '1' : '0';
    manager = users[i].isManager ? '1' : '0';
    admin = users[i].is_admin ? '1' : '0';
    out = `${out
    }"${users[i].given_name}",`
      + `"${users[i].family_name}",`
      + `"${jobTitle}",`
      + `"${org}",`
      + `"${bundles}",`
      + `"${roles}",`
      + `"${country}",`
      + `"${region}",`
      + `"${phoneNumber}",`
      + `"${skype}",`
      + `"${users[i].email}",`
      + `"${status}`;
    if (full) {
      out = `${out}",`
        + `"${users[i].createdAt}",`
        + `"${users[i].updatedAt}",`
        + `"${orphan}",`
        + `"${ghost}",`
        + `"${verified}",`
        + `"${manager}",`
        + `"${admin}"\n`;
    } else {
      out += '"\n';
    }
  }
  return out;
}

module.exports = {

  async create(request) {
    if (!request.payload.app_verify_url) {
      throw Boom.badRequest('Missing app_verify_url');
    }

    const appVerifyUrl = request.payload.app_verify_url;
    if (!HelperService.isAuthorizedUrl(appVerifyUrl)) {
      logger.warn('Invalid app_verify_url', { security: true, fail: true, request });
      throw Boom.badRequest('Invalid app_verify_url');
    }

    let record = null;
    if (request.payload.email) {
      record = await User.findOne({ 'emails.email': request.payload.email });
    }

    if (!record) {
      // Create user
      logger.debug('Preparing request for user creation', { request });

      if (request.payload.email) {
        request.payload.emails = [];
        request.payload.emails.push({ type: 'Work', email: request.payload.email, validated: false });
      }

      if (request.payload.password && request.payload.confirm_password) {
        if (!User.isStrongPassword(request.payload.password)) {
          throw Boom.badRequest('The password is not strong enough');
        }
        request.payload.password = User.hashPassword(request.payload.password);
      } else {
        // Set a random password
        request.payload.password = User.hashPassword(User.generateRandomPassword());
      }
      delete request.payload.app_verify_url;

      let notify = true;
      if (typeof request.payload.notify !== 'undefined') {
        const { notify: notif } = request.payload.notify;
        notify = notif;
      }
      delete request.payload.notify;

      let registrationType = '';
      if (request.payload.registration_type) {
        registrationType = request.payload.registration_type;
        delete request.payload.registration_type;
      }

      const childAttributes = User.listAttributes();
      HelperService.removeForbiddenAttributes(User, request, childAttributes);

      if (request.auth.credentials && registrationType === '') {
        // Creating an orphan user
        request.payload.createdBy = request.auth.credentials._id;
        // If an orphan is being created, do not expire
        request.payload.expires = new Date(0, 0, 1, 0, 0, 0);
        if (request.payload.email) {
          request.payload.is_orphan = true;
        } else {
          request.payload.is_ghost = true;
        }
      }

      // HID-1582: creating a short lived user for testing
      if (request.payload.tester) {
        const now = Date.now();
        request.payload.expires = new Date(now + 3600 * 1000);
        request.payload.email_verified = true;
        delete request.payload.tester;
      }

      const user = await User.create(request.payload);
      if (!user) {
        throw Boom.badRequest();
      }
      logger.debug(`User ${user._id.toString()} successfully created`, { request });

      if (user.email && notify === true) {
        if (!request.auth.credentials) {
          await EmailService.sendRegister(user, appVerifyUrl);
        } else if (registrationType === 'kiosk') {
          // An admin is creating an orphan user or Kiosk registration
          await EmailService.sendRegisterKiosk(user, appVerifyUrl);
        } else {
          await EmailService.sendRegisterOrphan(user, request.auth.credentials, appVerifyUrl);
        }
      }
      return user;
    } if (!request.auth.credentials) {
      throw Boom.badRequest('This email address is already registered. If you can not remember your password, please reset it');
    } else {
      throw Boom.badRequest(`This user already exists. user_id=${record._id.toString()}`);
    }
  },

  async find(request, reply) {
    const reqLanguage = acceptLanguage.get(request.headers['accept-language']);

    if (request.params.id) {
      const criteria = { _id: request.params.id };
      if (!request.auth.credentials.verified) {
        criteria.is_orphan = false;
        criteria.is_ghost = false;
      }
      // Do not show user if it is hidden
      if (!request.auth.credentials.is_admin
        && request.auth.credentials._id.toString() !== request.params.id) {
        criteria.hidden = false;
      }
      const user = await User.findOne(criteria);
      if (!user) {
        throw Boom.notFound();
      } else {
        user.sanitize(request.auth.credentials);
        user.translateListNames(reqLanguage);
        return user;
      }
    }
    const options = HelperService.getOptionsFromQuery(request.query);
    const criteria = HelperService.getCriteriaFromQuery(request.query);
    const childAttributes = User.listAttributes();

    // Hide hidden profile to non-admins
    if (request.auth.credentials && !request.auth.credentials.is_admin) {
      criteria.hidden = false;
    }

    // Do not allow exports for hidden users
    if (request.params.extension && request.auth.credentials.hidden) {
      throw Boom.unauthorized();
    }

    if (criteria.q) {
      if (validator.isEmail(criteria.q) && request.auth.credentials.verified) {
        criteria['emails.email'] = new RegExp(criteria.q, 'i');
      } else {
        criteria.name = criteria.q;
      }
      delete criteria.q;
    }

    if (criteria.name) {
      if (criteria.name.length < 3) {
        throw Boom.badRequest('Name must have at least 3 characters');
      }
      criteria.name = criteria.name.replace(/\(|\\|\^|\.|\||\?|\*|\+|\)|\[|\{|<|>|\/|"/g, '');
      criteria.name = new RegExp(criteria.name, 'i');
    }

    if (criteria.country) {
      criteria['location.country.id'] = criteria.country;
      delete criteria.country;
    }

    if (!request.auth.credentials.verified) {
      criteria.is_orphan = false;
      criteria.is_ghost = false;
    }
    const listIds = [];
    let lists = [];
    for (let i = 0; i < childAttributes.length; i += 1) {
      if (criteria[`${childAttributes[i]}.list`]) {
        listIds.push(criteria[`${childAttributes[i]}.list`]);
        delete criteria[`${childAttributes[i]}.list`];
      }
    }
    if (listIds.length) {
      lists = await List.find({ _id: { $in: listIds } });
      lists.forEach((list) => {
        if (list.isVisibleTo(request.auth.credentials)) {
          criteria[`${list.type}s`] = { $elemMatch: { list: list._id, deleted: false } };
          if (!list.isOwner(request.auth.credentials)) {
            criteria[`${list.type}s`].$elemMatch.pending = false;
          }
        } else {
          throw Boom.unauthorized('You are not authorized to view this list');
        }
      });
    }

    logger.debug('[UserController] (find) criteria = ', criteria, ' options = ', options, { request });
    let pdfFormat = '';
    if (criteria.format) {
      pdfFormat = criteria.format;
      delete criteria.format;
    }
    const query = HelperService.find(User, criteria, options);
    // HID-1561 - Set export limit to 2000
    if (!options.limit && request.params.extension) {
      query.limit(100000);
    }
    if (request.params.extension) {
      query.select('name given_name family_name email job_title phone_number status organization bundles location voips connections phonesVisibility emailsVisibility locationsVisibility createdAt updatedAt is_orphan is_ghost verified isManager is_admin functional_roles');
      query.lean();
    }
    const [results, number] = await Promise.all([query, User.countDocuments(criteria)]);
    if (!results) {
      throw Boom.notFound();
    }
    if (request.params.extension) {
      // Sanitize users and translate list names from a plain object
      for (let i = 0, len = results.length; i < len; i += 1) {
        User.sanitizeExportedUser(results[i], request.auth.credentials);
        if (results[i].organization) {
          User.translateCheckin(results[i].organization, reqLanguage);
        }
      }
      if (request.params.extension === 'csv') {
        let csvExport = '';
        if (request.auth.credentials.is_admin) {
          csvExport = _csvExport(results, true);
        } else {
          csvExport = _csvExport(results, false);
        }
        return reply.response(csvExport)
          .type('text/csv')
          .header('Content-Disposition', `attachment; filename="Humanitarian ID Contacts ${moment().format('YYYYMMDD')}.csv"`);
      }
      if (request.params.extension === 'txt') {
        return reply.response(_txtExport(results))
          .type('text/plain');
      }
      if (request.params.extension === 'pdf') {
        const [buffer, bytes] = await _pdfExport(results, number, lists, request, pdfFormat);
        return reply.response(buffer)
          .type('application/pdf')
          .bytes(bytes)
          .header('Content-Disposition', `attachment; filename="Humanitarian ID Contacts ${moment().format('YYYYMMDD')}.pdf"`);
      }
    }
    for (let i = 0, len = results.length; i < len; i += 1) {
      results[i].sanitize(request.auth.credentials);
      results[i].translateListNames(reqLanguage);
    }
    return reply.response(results).header('X-Total-Count', number);
  },

  async update(request) {
    logger.debug('[UserController] (update) model = user, criteria =', request.query, request.params.id,
      ', values = ', request.payload, { request });

    const childAttributes = User.listAttributes();
    HelperService.removeForbiddenAttributes(User, request, childAttributes);
    if (request.payload.password) {
      delete request.payload.password;
    }

    // Make sure user is verified if he is an admin or a manager
    if (request.payload.is_admin || request.payload.isManager) {
      request.payload.verified = true;
      request.payload.verificationExpiryEmail = false;
    }

    // Check old password
    let user = await User.findOne({ _id: request.params.id });
    if (!user) {
      throw Boom.notFound();
    }
    // If verifying user, set verified_by
    if (request.payload.verified && !user.verified) {
      request.payload.verified_by = request.auth.credentials._id;
      request.payload.verifiedOn = new Date();
      request.payload.verificationExpiryEmail = false;
    }
    if (request.payload.old_password && request.payload.new_password) {
      logger.warn('Updating user password', { request, security: true });
      if (user.validPassword(request.payload.old_password)) {
        if (!User.isStrongPassword(request.payload.new_password)) {
          logger.warn('Could not update user password. New password is not strong enough', { request, security: true, fail: true });
          throw Boom.badRequest('Password is not strong enough');
        }
        request.payload.password = User.hashPassword(request.payload.new_password);
        request.payload.lastPasswordReset = new Date();
        request.payload.passwordResetAlert30days = false;
        request.payload.passwordResetAlert7days = false;
        request.payload.passwordResetAlert = false;
        logger.warn('Successfully updated user password', { request, security: true });
      } else {
        logger.warn('Could not update user password. Old password is wrong', { request, security: true, fail: true });
        throw Boom.badRequest('The current password you entered is incorrect');
      }
    }
    if (request.payload.updatedAt) {
      delete request.payload.updatedAt;
    }
    // Update lastModified manually
    request.payload.lastModified = new Date();
    if (user.authOnly === false && request.payload.authOnly === true) {
      // User is becoming invisible. Update lists count.
      const listIds = user.getListIds(true);
      if (listIds.length) {
        await List.updateMany({ _id: { $in: listIds } }, {
          $inc: {
            countVerified: -1,
            countUnverified: -1,
          },
        });
      }
    }
    if (user.authOnly === true && request.payload.authOnly === false) {
      // User is becoming visible. Update lists count.
      const listIds = user.getListIds(true);
      if (listIds.length) {
        await List.updateMany({ _id: { $in: listIds } }, {
          $inc: {
            countVerified: 1,
            countUnverified: 1,
          },
        });
      }
    }
    if (user.hidden === false && request.payload.hidden === true) {
      // User is being flagged. Update lists count.
      const listIds = user.getListIds(true);
      if (listIds.length) {
        await List.updateMany({ _id: { $in: listIds } }, {
          $inc: {
            countManager: -1,
            countVerified: -1,
            countUnverified: -1,
          },
        });
      }
    }
    if (user.hidden === true && request.payload.hidden === false) {
      // User is being unflagged. Update lists count.
      const listIds = user.getListIds(true);
      if (listIds.length) {
        await List.updateMany({ _id: { $in: listIds } }, {
          $inc: {
            countManager: 1,
            countVerified: 1,
            countUnverified: 1,
          },
        });
      }
    }
    user = await User
      .findOneAndUpdate(
        { _id: request.params.id },
        request.payload,
        { runValidators: true, new: true },
      );
    user = await user.defaultPopulate();
    const promises = [];
    if (request.auth.credentials._id.toString() !== user._id.toString()) {
      // User is being edited by someone else
      // If it's an auth account, surface it
      if (user.authOnly) {
        user.authOnly = false;
        // User is becoming visible. Update lists count.
        const listIds = user.getListIds(true);
        if (listIds.length) {
          promises.push(List.updateMany({ _id: { $in: listIds } }, {
            $inc: {
              countVerified: 1,
              countUnverified: 1,
            },
          }));
        }
        promises.push(user.save());
        if (!user.hidden) {
          promises.push(EmailService.sendAuthToProfile(user, request.auth.credentials));
        }
      } else if (!user.hidden) {
        const notification = { type: 'admin_edit', user, createdBy: request.auth.credentials };
        promises.push(NotificationService.send(notification));
      }
    }
    promises.push(GSSSyncService.synchronizeUser(user));
    promises.push(OutlookService.synchronizeUser(user));
    try {
      await Promise.all(promises);
    } catch (err) {
      return user;
    }
    return user;
  },

  async destroy(request, reply) {
    if (!request.auth.credentials.is_admin
      && request.auth.credentials._id.toString() !== request.params.id) {
      return reply(Boom.forbidden('You are not allowed to delete this account'));
    }

    logger.debug('[UserController] (destroy) model = user, query =', request.query, { request });

    const user = await User.findOne({ _id: request.params.id });
    if (!user) {
      throw Boom.notFound();
    }
    await EmailService.sendAdminDelete(user, request.auth.credentials);
    await User.remove({ _id: request.params.id });
    return reply.response().code(204);
  },

  async setPrimaryEmail(request) {
    const { email } = request.payload;

    logger.debug('[UserController] Setting primary email', { request });

    if (!request.payload.email) {
      throw Boom.badRequest();
    }

    const record = await User.findOne({ _id: request.params.id });
    if (!record) {
      throw Boom.notFound();
    }
    // Make sure email is validated
    const index = record.emailIndex(email);
    if (index === -1) {
      throw Boom.badRequest('Email does not exist');
    }
    if (!record.emails[index].validated) {
      throw Boom.badRequest('Email has not been validated. You need to validate it first.');
    }
    record.email = email;
    // If we are there, it means that the email has been validated,
    // so make sure email_verified is set to true.
    record.verifyEmail(email);
    record.lastModified = new Date();
    await record.save();
    const promises = [];
    promises.push(GSSSyncService.synchronizeUser(record));
    promises.push(OutlookService.synchronizeUser(record));
    await Promise.all(promises);
    return record;
  },

  async validateEmail(request) {
    logger.debug('[UserController] Verifying email ', { request });

    // TODO: make sure current user can do this

    if (request.payload.hash) {
      const record = await User.findOne({ _id: request.payload.id });
      if (!record) {
        throw Boom.notFound();
      }
      let domain = null;
      let { email } = record;
      if (request.payload.emailId) {
        const emailRecord = record.emails.id(request.payload.emailId);
        if (emailRecord) {
          ({ email } = emailRecord);
        }
      }
      // Verify hash
      if (record.validHash(request.payload.hash, 'verify_email', request.payload.time, email) === true) {
        // Verify user email
        if (record.email === email) {
          record.email_verified = true;
          record.expires = new Date(0, 0, 1, 0, 0, 0);
          record.emails[0].validated = true;
          record.emails.set(0, record.emails[0]);
          record.lastModified = new Date();
          domain = await record.isVerifiableEmail(email);
        } else {
          for (let i = 0, len = record.emails.length; i < len; i += 1) {
            if (record.emails[i].email === email) {
              record.emails[i].validated = true;
              record.emails.set(i, record.emails[i]);
            }
          }
          record.lastModified = new Date();
          domain = await record.isVerifiableEmail(email);
        }
      } else {
        throw Boom.badRequest('Invalid hash');
      }
      if (domain) {
        record.verified = true;
        record.verified_by = hidAccount;
        record.verifiedOn = new Date();
        record.verificationExpiryEmail = false;
        // If the domain is associated to a list, check user in this list automatically
        if (domain.list) {
          if (!record.organizations) {
            record.organizations = [];
          }

          let isCheckedIn = false;
          // Make sure user is not already checked in this list
          for (let i = 0, len = record.organizations.length; i < len; i += 1) {
            if (record.organizations[i].list.equals(domain.list._id)
              && record.organizations[i].deleted === false) {
              isCheckedIn = true;
            }
          }

          if (!isCheckedIn) {
            await ListUserController.checkinHelper(domain.list, record, true, 'organizations', record);
          }
        }
      }
      const promises = [];
      promises.push(record.save());
      if (record.email === email) {
        promises.push(EmailService.sendPostRegister(record));
      }
      await Promise.all(promises);
      return record;
    }
    const record = await User.findOne({ 'emails.email': request.params.email });
    if (!record) {
      throw Boom.notFound();
    }
    // Send validation email again
    const appValidationUrl = request.payload.app_validation_url;
    if (!HelperService.isAuthorizedUrl(appValidationUrl)) {
      logger.warn('Invalid app_validation_url', { security: true, fail: true, request });
      throw Boom.badRequest('Invalid app_validation_url');
    }
    const emailIndex = record.emailIndex(request.params.email);
    const email = record.emails[emailIndex];
    await EmailService.sendValidationEmail(
      record,
      email.email,
      email._id.toString(),
      appValidationUrl,
    );
    return 'Validation email sent successfully';
  },

  async updatePassword(request, reply) {
    logger.debug('[UserController] Updating user password', { request });

    if (!request.payload.old_password || !request.payload.new_password) {
      throw Boom.badRequest('Request is missing parameters (old or new password)');
    }

    if (!User.isStrongPassword(request.payload.new_password)) {
      logger.warn('New password is not strong enough', { request, security: true, fail: true });
      throw Boom.badRequest('New password is not strong enough');
    }

    // Check old password
    const user = await User.findOne({ _id: request.params.id });
    if (!user) {
      throw Boom.notFound();
    }
    logger.warn('Updating user password', { request, security: true });
    if (user.validPassword(request.payload.old_password)) {
      user.password = User.hashPassword(request.payload.new_password);
      user.lastModified = new Date();
      logger.warn('Successfully updated user password', { request, security: true });
      await user.save();
    } else {
      logger.warn('Could not update user password. Old password is wrong', { request, security: true, fail: true });
      throw Boom.badRequest('The old password is wrong');
    }
    return reply.response().code(204);
  },

  async resetPasswordEndpoint(request) {
    if (request.payload.email) {
      const appResetUrl = request.payload.app_reset_url;

      if (!HelperService.isAuthorizedUrl(appResetUrl)) {
        logger.warn('Invalid app_reset_url', { security: true, fail: true, request });
        throw Boom.badRequest('app_reset_url is invalid');
      }
      const record = await User.findOne({ email: request.payload.email.toLowerCase() });
      if (!record) {
        return '';
      }
      await EmailService.sendResetPassword(record, appResetUrl);
      return '';
    }
    const cookie = request.yar.get('session');
    if (!request.payload.hash || !request.payload.password
      || !request.payload.id || !request.payload.time) {
      throw Boom.badRequest('Wrong arguments');
    }

    if (!User.isStrongPassword(request.payload.password)) {
      logger.warn('Could not reset password. New password is not strong enough.', { security: true, fail: true, request });
      throw Boom.badRequest('New password is not strong enough');
    }

    logger.warn('Resetting password', { security: true, request });
    let record = await User.findOne({ _id: request.payload.id });
    if (!record) {
      logger.warn('Could not reset password. User not found', { security: true, fail: true, request });
      throw Boom.badRequest('Reset password link is expired or invalid');
    }
    if (record.totp && !cookie) {
      // Check that there is a TOTP token and that it is valid
      const token = request.headers['x-hid-totp'];
      record = await AuthPolicy.isTOTPValid(record, token);
    }
    let domain = null;
    if (record.validHash(request.payload.hash, 'reset_password', request.payload.time) === true) {
      const pwd = User.hashPassword(request.payload.password);
      if (pwd === record.password) {
        throw Boom.badRequest('The new password can not be the same as the old one');
      } else {
        record.password = pwd;
        record.verifyEmail(record.email);
        domain = await record.isVerifiableEmail(record.email);
      }
    } else {
      throw Boom.badRequest('Reset password link is expired or invalid');
    }
    if (domain) {
      // Reset verifiedOn date as user was able to
      // reset his password via an email from a trusted domain
      record.verified = true;
      record.verified_by = hidAccount;
      record.verifiedOn = new Date();
      record.verificationExpiryEmail = false;
    }
    record.expires = new Date(0, 0, 1, 0, 0, 0);
    if (record.is_orphan === true || record.is_ghost === true) {
      // User is not an orphan anymore. Update lists count.
      const listIds = record.getListIds(true);
      if (listIds.length) {
        await List.updateMany({ _id: { $in: listIds } }, { $inc: { countUnverified: 1 } });
      }
    }
    record.is_orphan = false;
    record.is_ghost = false;
    record.lastPasswordReset = new Date();
    record.passwordResetAlert30days = false;
    record.passwordResetAlert7days = false;
    record.passwordResetAlert = false;
    record.lastModified = new Date();
    await record.save();
    logger.warn('Password updated successfully', { security: true, request });
    return 'Password reset successfully';
  },

  async claimEmail(request, reply) {
    const appResetUrl = request.payload.app_reset_url;
    const userId = request.params.id;

    if (!HelperService.isAuthorizedUrl(appResetUrl)) {
      logger.warn('Invalid app_reset_url', { security: true, fail: true, request });
      throw Boom.badRequest('app_reset_url is invalid');
    }

    const record = await User.findOne({ _id: userId });
    if (!record) {
      throw Boom.notFound();
    }
    await EmailService.sendClaim(record, appResetUrl);
    return reply.response('Claim email sent successfully').code(202);
  },

  async updatePicture(request) {
    const userId = request.params.id;

    logger.debug('[UserController] Updating picture ', { request });

    const data = request.payload;
    if (data.file) {
      const image = sharp(data.file);
      const record = await User.findOne({ _id: userId });
      if (!record) {
        throw Boom.notFound();
      }
      const metadata = await image.metadata();
      if (metadata.format !== 'jpeg' && metadata.format !== 'png') {
        throw Boom.badRequest('Invalid image format. Only jpeg and png are accepted');
      }
      let path = `${__dirname}/../../assets/pictures/${userId}.`;
      let ext = '';
      ext = metadata.format;
      path += ext;
      await image.resize(200, 200).toFile(path);
      record.picture = `${process.env.ROOT_URL}/assets/pictures/${userId}.${metadata.format}`;
      record.lastModified = new Date();
      await record.save();
      return record;
    }
    throw Boom.badRequest('No file found');
  },

  async addEmail(request) {
    const appValidationUrl = request.payload.app_validation_url;
    const userId = request.params.id;

    logger.debug('[UserController] adding email', { request });

    if (!appValidationUrl || !request.payload.email) {
      throw Boom.badRequest();
    }

    if (!HelperService.isAuthorizedUrl(appValidationUrl)) {
      logger.warn('Invalid app_validation_url', { security: true, fail: true, request });
      throw Boom.badRequest('Invalid app_validation_url');
    }

    // Make sure email added is unique
    const erecord = await User.findOne({ 'emails.email': request.payload.email });
    if (erecord) {
      throw Boom.badRequest('Email is not unique');
    }
    const record = await User.findOne({ _id: userId });
    if (!record) {
      throw Boom.notFound();
    }
    const { email } = request.payload;
    if (record.emailIndex(email) !== -1) {
      throw Boom.badRequest('Email already exists');
    }
    if (record.emails.length === 0 && record.is_ghost) {
      // Turn ghost into orphan and set main email address
      record.is_ghost = false;
      record.is_orphan = true;
      record.email = request.payload.email;
    }
    const data = { email: request.payload.email, type: request.payload.type, validated: false };
    record.emails.push(data);
    record.lastModified = new Date();
    const savedRecord = await record.save();
    const savedEmailIndex = savedRecord.emailIndex(email);
    const savedEmail = savedRecord.emails[savedEmailIndex];
    // Send confirmation email
    const promises = [];
    promises.push(
      EmailService.sendValidationEmail(
        record,
        email,
        savedEmail._id.toString(),
        appValidationUrl,
      ),
    );
    for (let i = 0; i < record.emails.length; i += 1) {
      promises.push(
        EmailService.sendEmailAlert(record, record.emails[i].email, request.payload.email),
      );
    }
    promises.push(OutlookService.synchronizeUser(record));
    await Promise.all(promises);
    return record;
  },

  async dropEmail(request) {
    const userId = request.params.id;

    logger.debug('[UserController] dropping email', { request });

    if (!request.params.email) {
      throw Boom.badRequest();
    }

    const record = await User.findOne({ _id: userId });
    if (!record) {
      throw Boom.notFound();
    }
    const { email } = request.params;
    if (email === record.email) {
      throw Boom.badRequest('You can not remove the primary email');
    }
    const index = record.emailIndex(email);
    if (index === -1) {
      throw Boom.badRequest('Email does not exist');
    }
    record.emails.splice(index, 1);
    record.lastModified = new Date();
    const stillVerified = await record.canBeVerifiedAutomatically();
    if (!stillVerified) {
      record.verified = false;
    }
    await record.save();
    await OutlookService.synchronizeUser(record);
    return record;
  },

  async addPhone(request) {
    const userId = request.params.id;

    logger.debug('[UserController] adding phone number', { request });

    const record = await User.findOne({ _id: userId });
    if (!record) {
      throw Boom.notFound();
    }
    const data = { number: request.payload.number, type: request.payload.type };
    record.phone_numbers.push(data);
    record.lastModified = new Date();
    await Promise.all([
      record.save(),
      OutlookService.synchronizeUser(record),
    ]);
    return record;
  },

  async dropPhone(request) {
    const userId = request.params.id;
    const phoneId = request.params.pid;

    logger.debug('[UserController] dropping phone number', { request });

    const record = await User.findOne({ _id: userId });
    if (!record) {
      throw Boom.notFound();
    }
    let index = -1;
    for (let i = 0, len = record.phone_numbers.length; i < len; i += 1) {
      if (record.phone_numbers[i]._id.toString() === phoneId) {
        index = i;
      }
    }
    if (index === -1) {
      throw Boom.notFound();
    }
    // Do not allow deletion of primary phone number
    if (record.phone_numbers[index].number === record.phone_number) {
      record.phone_number = '';
      record.phone_number_type = '';
    }
    record.phone_numbers.splice(index, 1);
    record.lastModified = new Date();
    await Promise.all([
      record.save(),
      OutlookService.synchronizeUser(record),
    ]);
    return record;
  },

  async setPrimaryPhone(request) {
    const { phone } = request.payload;

    logger.debug('[UserController] Setting primary phone number', { request });

    if (!request.payload.phone) {
      throw Boom.badRequest();
    }
    const record = await User.findOne({ _id: request.params.id });
    if (!record) {
      throw Boom.notFound();
    }
    // Make sure phone is part of phone_numbers
    let index = -1;
    for (let i = 0, len = record.phone_numbers.length; i < len; i += 1) {
      if (record.phone_numbers[i].number === phone) {
        index = i;
      }
    }
    if (index === -1) {
      throw Boom.badRequest('Phone does not exist');
    }
    record.phone_number = record.phone_numbers[index].number;
    record.phone_number_type = record.phone_numbers[index].type;
    record.lastModified = new Date();
    await Promise.all([
      record.save(),
      GSSSyncService.synchronizeUser(record),
      OutlookService.synchronizeUser(record),
    ]);
    return record;
  },

  async setPrimaryOrganization(request) {
    if (!request.payload) {
      throw Boom.badRequest('Missing listUser id');
    }
    if (!request.payload._id) {
      throw Boom.badRequest('Missing listUser id');
    }

    const user = await User.findOne({ _id: request.params.id });
    if (!user) {
      throw Boom.notFound();
    }
    const checkin = user.organizations.id(request.payload._id);
    if (!checkin) {
      throw Boom.badRequest('Organization should be part of user organizations');
    }
    if (user.organization) {
      user.organization.set(checkin);
    } else {
      user.organization = checkin;
    }
    user.lastModified = new Date();
    await Promise.all([
      user.save(),
      GSSSyncService.synchronizeUser(user),
      OutlookService.synchronizeUser(user),
    ]);
    return user;
  },

  showAccount(request) {
    logger.info(`calling /account.json for ${request.auth.credentials.email}`, { request });
    const user = JSON.parse(JSON.stringify(request.auth.credentials));
    if (request.params.currentClient && (request.params.currentClient.id === 'iasc-prod' || request.params.currentClient.id === 'iasc-dev')) {
      user.sub = user.email;
    }
    if (request.params.currentClient && request.params.currentClient.id === 'dart-prod') {
      delete user._id;
    }
    if (request.params.currentClient && request.params.currentClient.id === 'kaya-prod') {
      user.name = user.name.replace(' ', '');
    }
    if (request.params.currentClient
      && (request.params.currentClient.id === 'rc-shelter-database'
        || request.params.currentClient.id === 'rc-shelter-db-2-prod'
        || request.params.currentClient.id === 'deep-prod')) {
      user.active = !user.deleted;
    }
    return user;
  },

  async notify(request) {
    logger.debug('[UserController] Notifying user', { request });

    const record = await User.findOne({ _id: request.params.id });
    if (!record) {
      throw Boom.notFound();
    }

    const notPayload = {
      type: 'contact_needs_update',
      createdBy: request.auth.credentials,
      user: record,
    };
    await NotificationService.send(notPayload);

    return record;
  },

  async addConnection(request) {
    logger.debug('[UserController] Adding connection', { request });

    const user = await User.findOne({ _id: request.params.id });
    if (!user) {
      throw Boom.notFound();
    }

    if (!user.connections) {
      user.connections = [];
    }
    if (user.connectionsIndex(request.auth.credentials._id) !== -1) {
      throw Boom.badRequest('User is already a connection');
    }

    user.connections.push({ pending: true, user: request.auth.credentials._id });
    user.lastModified = new Date();

    const notification = {
      type: 'connection_request',
      createdBy: request.auth.credentials,
      user,
    };
    await Promise.all([
      user.save(),
      NotificationService.send(notification),
    ]);
    return user;
  },

  async updateConnection(request) {
    logger.debug('[UserController] Updating connection', { request });

    const user = await User.findOne({ _id: request.params.id });
    if (!user) {
      throw Boom.notFound();
    }
    const connection = user.connections.id(request.params.cid);
    connection.pending = false;
    user.lastModified = new Date();
    await user.save();
    const cuser = await User.findOne({ _id: connection.user });
    // Create connection with current user
    const cindex = cuser.connectionsIndex(user._id);
    if (cindex === -1) {
      cuser.connections.push({ pending: false, user: user._id });
    } else {
      cuser.connections[cindex].pending = false;
    }
    cuser.lastModified = new Date();
    await cuser.save();
    // Send notification
    const notification = {
      type: 'connection_approved',
      createdBy: user,
      user: cuser,
    };
    await NotificationService.send(notification);
    return user;
  },

  async deleteConnection(request) {
    logger.debug('[UserController] Deleting connection', { request });

    const user = await User.findOne({ _id: request.params.id });
    if (!user) {
      throw Boom.notFound();
    }
    user.connections.id(request.params.cid).remove();
    user.lastModified = new Date();
    await user.save();
    return user;
  },
};
