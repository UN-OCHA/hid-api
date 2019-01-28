'use strict';

const Boom = require('boom');
const _ = require('lodash');
const async = require('async');
const acceptLanguage = require('accept-language');
const List = require('../models/List');
const User = require('../models/User');
const HelperService = require('../services/HelperService');
const NotificationService = require('../services/NotificationService');
const ErrorService = require('../services/ErrorService');
const config = require('../../config/env')[process.env.NODE_ENV];
const logger = config.logger;

/**
 * @module ListController
 * @description Generated Trails.js Controller.
 */

function _removeForbiddenAttributes (request) {
  HelperService.removeForbiddenAttributes(List, request, ['names']);
}

function _notifyManagers(uids, type, request, list) {
  User
    .find({_id: {$in: uids}})
    .then((users) => {
      for (let i = 0, len = users.length; i < len; i++) {
        NotificationService
          .send({
            type: type,
            user: users[i],
            createdBy: request.params.currentUser,
            params: { list: list }
          }, () => {});
      }
    })
    .catch((err) => {
      logger.error('Unexpected error', {request: request, error: err});
    });
}

module.exports = {

  create: function (request, reply) {
    _removeForbiddenAttributes(request);
    request.payload.owner = request.params.currentUser._id;
    if (!request.payload.managers) {
      request.payload.managers = [];
    }
    request.payload.managers.push(request.params.currentUser._id);
    List
      .create(request.payload)
      .then((list) => {
        return reply(list);
      })
      .catch(err => {
        ErrorService.handle(err, request, reply);
      });
  },

  find: function (request, reply) {
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

    logger.debug(
      '[ListController] (find) model = list, criteria =',
      request.query,
      request.params.id,
      'options =',
      options,
      { request: request}
    );

    // List visiblity
    const that = this;

    if (request.params.id) {
      if (!options.populate) {
        options.populate = [
          {path: 'owner', select: '_id name'},
          {path: 'managers', select: '_id name'}
        ];
      }
      List
        .findOne({_id: request.params.id, deleted: criteria.deleted })
        .populate(options.populate)
        .then(result => {
          if (!result) {
            throw Boom.notFound();
          }

          const out = result.toJSON();
          out.name = result.translatedAttribute('names', reqLanguage);
          out.acronym = result.translatedAttribute('acronyms', reqLanguage);
          out.visible = result.isVisibleTo(request.params.currentUser);
          return reply(out);
        })
        .catch(err => { ErrorService.handle(err, request, reply); });
    }
    else {
      options.populate = [{path: 'owner', select: '_id name'}];
      if (!request.params.currentUser.is_admin && !request.params.currentUser.isManager) {
        criteria.$or = [{visibility: 'all'}, {visibility: 'inlist'}, {$and: [{ visibility: 'me'}, {managers: request.params.currentUser._id}]}];
        if (request.params.currentUser.verified) {
          criteria.$or.push({visibility: 'verified'});
        }
      }
      const query = HelperService.find(List, criteria, options);
      query
        .then((results) => {
          return List
            .count(criteria)
            .then((number) => {
              return {result: results, number: number};
            });
        })
        .then((result) => {
          const out = [];
          let tmp = {};
          let optionsArray = [];
          if (options.fields) {
            optionsArray = options.fields.split(' ');
          }
          async.eachSeries(result.result, function (list, next) {
            tmp = list.toJSON();
            tmp.visible = list.isVisibleTo(request.params.currentUser);
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
              User
                .count(ucriteria)
                .then((count) => {
                  tmp.count = count;
                  out.push(tmp);
                  next();
                });
            }
            else {
              out.push(tmp);
              next();
            }
          }, function (err) {
            reply(out).header('X-Total-Count', result.number);
          });
        })
        .catch((err) => {
          ErrorService.handle(err, request, reply);
        });
    }
  },

  update: function (request, reply) {

    _removeForbiddenAttributes(request);

    logger.debug(
      '[ListController] (update) model = list, criteria =',
      request.query,
      request.params.id,
      ', values = ',
      request.payload,
      { request: request }
    );

    let newlist = {};
    List
      .findOne({_id: request.params.id})
      .then(list => {
        return List
          .findOneAndUpdate({_id: request.params.id}, request.payload, {runValidators: true, new: true});
      })
      .then((list2) => {
        newlist = list2;
        reply(list2);
      })
      .then(() => {
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
          _notifyManagers(diffAdded, 'added_list_manager', request, newlist);
        }
        if (diffRemoved.length) {
          _notifyManagers(diffRemoved, 'removed_list_manager', request, newlist);
        }

        // Update users
        const criteria = {};
        criteria[newlist.type + 's.list'] = newlist._id.toString();
        return User
          .find(criteria);
      })
      .then(users => {
        let actions = [];
        for (let i = 0; i < users.length; i++) {
          const user = users[i];
          user.updateCheckins(newlist);
          actions.push(user.save());
        }
        return Promise.all(actions);
      })
      .catch((err) => {
        ErrorService.handle(err, request, reply);
      });
  },

  destroy: function (request, reply) {

    logger.debug('[ListController] (destroy) model = list, query =', request.query, { request: request});

    List
      .findOne({ _id: request.params.id })
      .then(record => {
        if (!record) {
          throw Boom.notFound();
        }
        // Set deleted to true
        record.deleted = true;
        return record
          .save()
          .then(() => {
            return record;
          });
      })
      .then((record) => {
        reply(record);
        // Remove all checkins from users in this list
        const criteria = {};
        criteria[record.type + 's.list'] = record._id.toString();
        return User
          .find(criteria)
          .then(users => {
            for (let i = 0; i < users.length; i++) {
              const user = users[i];
              for (let j = 0; j < user[record.type + 's'].length; j++) {
                if (user[record.type + 's'][j].list.toString() === record._id.toString()) {
                  user[record.type + 's'][j].deleted = true;
                }
              }
              user.save();
            }
          });
      })
      .catch(err => {
        ErrorService.handle(err, request, reply);
      });
  }

};
