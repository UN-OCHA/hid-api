

const Boom = require('boom');
const _ = require('lodash');
const acceptLanguage = require('accept-language');
const List = require('../models/List');
const User = require('../models/User');
const HelperService = require('../services/HelperService');
const NotificationService = require('../services/NotificationService');

/**
 * @module ListController
 * @description Generated Trails.js Controller.
 */

module.exports = {

  async create(request) {
    HelperService.removeForbiddenAttributes(List, request, ['names']);
    request.payload.owner = request.auth.credentials._id;
    if (!request.payload.managers) {
      request.payload.managers = [];
    }
    request.payload.managers.push(request.auth.credentials._id);
    const list = await List.create(request.payload);
    return list;
  },

  async find(request, reply) {
    const reqLanguage = acceptLanguage.get(request.headers['accept-language']);
    const options = HelperService.getOptionsFromQuery(request.query);
    const criteria = HelperService.getCriteriaFromQuery(request.query);

    if (!options.sort) {
      options.sort = 'name';
    }

    if (options.sort === '-count' && !request.auth.credentials.is_admin) {
      if (request.auth.credentials.isManager) {
        options.sort = '-countManager';
      } else if (request.auth.verified) {
        options.sort = '-countVerified';
      } else {
        options.sort = '-countUnverified';
      }
    }

    // Search with contains when searching in name or label
    if (criteria.name) {
      if (criteria.name.length < 3) {
        throw Boom.badRequest('Name must have at least 3 characters');
      }
      let name = criteria.name.replace(/\(|\\|\^|\.|\||\?|\*|\+|\)|\[|\{|<|>|\/|"/g, '');
      name = new RegExp(name, 'i');
      criteria['names.text'] = name;
      delete criteria.name;
    }
    if (criteria.label) {
      criteria.label = criteria.label.replace(/\(|\\|\^|\.|\||\?|\*|\+|\)|\[|\{|<|>|\/|"/g, '');
      criteria.label = new RegExp(criteria.label, 'i');
    }

    // Do not show deleted lists
    criteria.deleted = false;

    // List visiblity

    if (request.params.id) {
      if (!options.populate) {
        options.populate = [
          { path: 'owner', select: '_id name' },
          { path: 'managers', select: '_id name' },
        ];
      }
      const result = await List.findOne({
        _id: request.params.id, deleted: criteria.deleted,
      }).populate(options.populate);
      if (!result) {
        throw Boom.notFound();
      }

      const out = result.toJSON();
      out.name = result.translatedAttribute('names', reqLanguage);
      out.acronym = result.translatedAttribute('acronyms', reqLanguage);
      out.visible = result.isVisibleTo(request.auth.credentials);
      out.count = result.getCount(request.auth.credentials);
      return out;
    }
    options.populate = [{ path: 'owner', select: '_id name' }];
    if (!request.auth.credentials.is_admin && !request.auth.credentials.isManager) {
      criteria.$or = [{ visibility: 'all' }, { visibility: 'inlist' }, { $and: [{ visibility: 'me' }, { managers: request.auth.credentials._id }] }];
      if (request.auth.credentials.verified) {
        criteria.$or.push({ visibility: 'verified' });
      }
    }
    const [results, number] = await Promise.all([
      HelperService.find(List, criteria, options),
      List.countDocuments(criteria),
    ]);
    const out = [];
    let tmp = {};
    let optionsArray = [];
    if (options.fields) {
      optionsArray = options.fields.split(' ');
    }
    for (let i = 0; i < results.length; i += 1) {
      const list = results[i];
      tmp = list.toJSON();
      tmp.visible = list.isVisibleTo(request.auth.credentials);
      if (optionsArray.length === 0 || (optionsArray.length > 0 && optionsArray.indexOf('names') !== -1)) {
        tmp.name = list.translatedAttribute('names', reqLanguage);
      }
      if (optionsArray.length === 0 || (optionsArray.length > 0 && optionsArray.indexOf('acronyms') !== -1)) {
        tmp.acronym = list.translatedAttribute('acronyms', reqLanguage);
      }
      tmp.count = list.getCount(request.auth.credentials);
      out.push(tmp);
    }
    return reply.response(out).header('X-Total-Count', number);
  },

  async update(request) {
    HelperService.removeForbiddenAttributes(List, request, ['names']);

    const list = await List.findById(request.params.id);
    const newlist = _.merge(list, request.payload);
    await newlist.computeCounts();
    await newlist.save();
    const payloadManagers = [];
    if (request.payload.managers) {
      request.payload.managers.forEach((man) => {
        payloadManagers.push(man.toString());
      });
    }
    const listManagers = [];
    if (newlist.managers) {
      newlist.managers.forEach((man) => {
        listManagers.push(man.toString());
      });
    }
    const diffAdded = _.difference(payloadManagers, listManagers);
    const diffRemoved = _.difference(listManagers, payloadManagers);
    const notifications = [];
    if (diffAdded.length) {
      const users = await User.find({ _id: { $in: diffAdded } });
      for (let i = 0; i < users.length; i += 1) {
        const user = users[i];
        notifications.push(NotificationService
          .send({
            type: 'added_list_manager',
            user,
            createdBy: request.auth.credentials,
            params: { list: newlist },
          }));
      }
    }
    if (diffRemoved.length) {
      const users = await User.find({ _id: { $in: diffRemoved } });
      for (let i = 0; i < users.length; i += 1) {
        const user = users[i];
        notifications.push(NotificationService
          .send({
            type: 'removed_list_manager',
            user,
            createdBy: request.auth.credentials,
            params: { list: newlist },
          }));
      }
    }
    await Promise.all(notifications);
    // Update users
    const criteria = {};
    criteria[`${newlist.type}s.list`] = newlist._id.toString();
    const users = await User.find(criteria);
    const actions = [];
    for (let i = 0; i < users.length; i += 1) {
      const user = users[i];
      user.updateCheckins(newlist);
      actions.push(user.save());
    }
    await Promise.all(actions);
    return newlist;
  },

  async destroy(request) {
    const record = await List.findOne({ _id: request.params.id });
    if (!record) {
      throw Boom.notFound();
    }
    // Set deleted to true
    record.deleted = true;
    const newRecord = await record.save();
    // Remove all checkins from users in this list
    const criteria = {};
    criteria[`${record.type}s.list`] = record._id.toString();
    const promises = [];
    const users = await User.find(criteria);
    for (let i = 0; i < users.length; i += 1) {
      const user = users[i];
      for (let j = 0; j < user[`${record.type}s`].length; j += 1) {
        if (user[`${record.type}s`][j].list.toString() === record._id.toString()) {
          user[`${record.type}s`][j].deleted = true;
        }
      }
      promises.push(user.save());
    }
    await Promise.all(promises);
    return newRecord;
  },

};
