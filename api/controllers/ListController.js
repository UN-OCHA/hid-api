'use strict';

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

  create: async function (request, reply) {
    HelperService.removeForbiddenAttributes(List, request, ['names']);
    request.payload.owner = request.auth.credentials._id;
    if (!request.payload.managers) {
      request.payload.managers = [];
    }
    request.payload.managers.push(request.auth.credentials._id);
    const list = await List.create(request.payload);
    return list;
  },

  find: async function (request, reply) {
    const reqLanguage = acceptLanguage.get(request.headers['accept-language']);
    const options = HelperService.getOptionsFromQuery(request.query);
    const criteria = HelperService.getCriteriaFromQuery(request.query);

    if (!options.sort) {
      options.sort = 'name';
    }

    // Search with contains when searching in name or label
    if (criteria.name) {
      if (criteria.name.length < 3) {
        return reply(Boom.badRequest('Name must have at least 3 characters'));
      }
      let name = criteria.name.replace(/\(|\\|\^|\.|\||\?|\*|\+|\)|\[|\{|<|>|\/|"/, '-');
      name = new RegExp(name, 'i');
      criteria['names.text'] = name;
      delete criteria.name;
    }
    if (criteria.label) {
      criteria.label = criteria.label.replace(/\(|\\|\^|\.|\||\?|\*|\+|\)|\[|\{|<|>|\/|"/, '-');
      criteria.label = new RegExp(criteria.label, 'i');
    }

    // Do not show deleted lists
    criteria.deleted = false;

    // List visiblity

    if (request.params.id) {
      if (!options.populate) {
        options.populate = [
          {path: 'owner', select: '_id name'},
          {path: 'managers', select: '_id name'}
        ];
      }
      const result = await List.findOne({_id: request.params.id, deleted: criteria.deleted }).populate(options.populate);
      if (!result) {
        throw Boom.notFound();
      }

      const out = result.toJSON();
      out.name = result.translatedAttribute('names', reqLanguage);
      out.acronym = result.translatedAttribute('acronyms', reqLanguage);
      out.visible = result.isVisibleTo(request.auth.credentials);
      return out;
    }
    else {
      options.populate = [{path: 'owner', select: '_id name'}];
      if (!request.auth.credentials.is_admin && !request.auth.credentials.isManager) {
        criteria.$or = [{visibility: 'all'}, {visibility: 'inlist'}, {$and: [{ visibility: 'me'}, {managers: request.auth.credentials._id}]}];
        if (request.auth.credentials.verified) {
          criteria.$or.push({visibility: 'verified'});
        }
      }
      const [results, number] = await Promise.all([HelperService.find(List, criteria, options), List.countDocuments(criteria)]);
      const out = [];
      let tmp = {};
      let optionsArray = [];
      if (options.fields) {
        optionsArray = options.fields.split(' ');
      }
      for (const list of results) {
        tmp = list.toJSON();
        tmp.visible = list.isVisibleTo(request.auth.credentials);
        if (optionsArray.length === 0 || (optionsArray.length > 0 && optionsArray.indexOf('names') !== -1)) {
          tmp.name = list.translatedAttribute('names', reqLanguage);
        }
        if (optionsArray.length === 0 || (optionsArray.length > 0 && optionsArray.indexOf('acronyms') !== -1)) {
          tmp.acronym = list.translatedAttribute('acronyms', reqLanguage);
        }
        if (optionsArray.indexOf('count') !== -1) {
          const ucriteria = {};
          ucriteria[list.type + 's'] = {
            $elemMatch: {list: list._id, deleted: false, pending: false}
          };
          tmp.count = await User.countDocuments(ucriteria);
        }
        out.push(tmp);
      }
      return reply.response(out).header('X-Total-Count', number);
    }
  },

  update: async function (request, reply) {

    HelperService.removeForbiddenAttributes(List, request, ['names']);

    const newlist = await List.findOneAndUpdate({_id: request.params.id}, request.payload, {runValidators: true, new: true});
    const payloadManagers = [];
    if (request.payload.managers) {
      request.payload.managers.forEach(function (man) {
        payloadManagers.push(man.toString());
      });
    }
    const listManagers = [];
    if (newlist.managers) {
      newlist.managers.forEach(function (man) {
        listManagers.push(man.toString());
      });
    }
    const diffAdded = _.difference(payloadManagers, listManagers);
    const diffRemoved = _.difference(listManagers, payloadManagers);
    if (diffAdded.length) {
      const users = await User.find({_id: {$in: diffAdded}});
      for (const user of users) {
        await NotificationService
          .send({
            type: 'added_list_manager',
            user: user,
            createdBy: request.auth.credentials,
            params: { list: newlist }
          }, () => {});
      }
    }
    if (diffRemoved.length) {
      const users = await User.find({_id: {$in: diffRemoved}});
      for (const user of users) {
        await NotificationService
          .send({
            type: 'removed_list_manager',
            user: user,
            createdBy: request.auth.credentials,
            params: { list: newlist }
          }, () => {});
      }
    }

    // Update users
    const criteria = {};
    criteria[newlist.type + 's.list'] = newlist._id.toString();
    const users = await User.find(criteria);
    const actions = [];
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      user.updateCheckins(newlist);
      actions.push(user.save());
    }
    await Promise.all(actions);
    return newlist;
  },

  destroy: async function (request, reply) {
    const record = await List.findOne({ _id: request.params.id });
    if (!record) {
      throw Boom.notFound();
    }
    // Set deleted to true
    record.deleted = true;
    const newRecord = await record.save();
    // Remove all checkins from users in this list
    const criteria = {};
    criteria[record.type + 's.list'] = record._id.toString();
    const users = await User.find(criteria);
    for (const user of users) {
      for (let j = 0; j < user[record.type + 's'].length; j++) {
        if (user[record.type + 's'][j].list.toString() === record._id.toString()) {
          user[record.type + 's'][j].deleted = true;
        }
      }
      await user.save();
    }
    return newRecord;
  }

};
