'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');
const _ = require('lodash');
const async = require('async');
const acceptLanguage = require('accept-language');

/**
 * @module ListController
 * @description Generated Trails.js Controller.
 */
module.exports = class ListController extends Controller{

  _removeForbiddenAttributes (request) {
    this.app.services.HelperService.removeForbiddenAttributes('List', request, ['names']);
  }

  create (request, reply) {
    const List = this.app.orm.List;
    this._removeForbiddenAttributes(request);
    request.payload.owner = request.params.currentUser._id;
    if (!request.payload.managers) {
      request.payload.managers = [];
    }
    request.payload.managers.push(request.params.currentUser._id);
    const that = this;
    List
      .create(request.payload)
      .then((list) => {
        return reply(list);
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  find (request, reply) {
    const reqLanguage = acceptLanguage.get(request.headers['accept-language']);
    const options = this.app.services.HelperService.getOptionsFromQuery(request.query);
    const criteria = this.app.services.HelperService.getCriteriaFromQuery(request.query);
    const List = this.app.orm.List;
    const User = this.app.orm.User;

    if (!options.sort) {
      options.sort = 'name';
    }

    // Search with contains when searching in name or label
    if (criteria.name) {
      if (criteria.name.length < 3) {
        return reply(Boom.badRequest('Name must have at least 3 characters'));
      }
      let name = criteria.name.replace(/\(|\\|\^|\.|\||\?|\*|\+|\)|\[|\{|\<|\>|\/|\"/, '-');
      name = new RegExp(name, 'i');
      criteria['names.text'] = name;
      delete criteria.name;
    }
    if (criteria.label) {
      criteria.label = criteria.label.replace(/\(|\\|\^|\.|\||\?|\*|\+|\)|\[|\{|\<|\>|\/|\"/, '-');
      criteria.label = new RegExp(criteria.label, 'i');
    }

    // Do not show deleted lists
    criteria.deleted = false;

    this.log.debug(
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
        .catch(err => { that.app.services.ErrorService.handle(err, request, reply); });
    }
    else {
      options.populate = [{path: 'owner', select: '_id name'}];
      if (!request.params.currentUser.is_admin && !request.params.currentUser.isManager) {
        criteria.$or = [{visibility: 'all'}, {visibility: 'inlist'}, {$and: [{ visibility: 'me'}, {managers: request.params.currentUser._id}]}];
        if (request.params.currentUser.verified) {
          criteria.$or.push({visibility: 'verified'});
        }
      }
      const query = this.app.services.HelperService.find('List', criteria, options);
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
          that.app.services.ErrorService.handle(err, request, reply);
        });
    }
  }

  _notifyManagers(uids, type, request, list) {
    const User = this.app.orm.user;
    const that = this;
    User
      .find({_id: {$in: uids}})
      .then((users) => {
        for (let i = 0, len = users.length; i < len; i++) {
          that.app.services.NotificationService
            .send({
              type: type,
              user: users[i],
              createdBy: request.params.currentUser,
              params: { list: list }
            }, () => {});
        }
      })
      .catch((err) => {
        that.log.error('Unexpected error', {request: request, error: err});
      });
  }

  update (request, reply) {
    const Model = this.app.orm.list;
    const User = this.app.orm.user;

    this._removeForbiddenAttributes(request);

    this.log.debug(
      '[ListController] (update) model = list, criteria =',
      request.query,
      request.params.id,
      ', values = ',
      request.payload,
      { request: request }
    );

    const that = this;
    let newlist = {};
    Model
      .findOne({_id: request.params.id})
      .then(list => {
        return Model
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
          that._notifyManagers(diffAdded, 'added_list_manager', request, newlist);
        }
        if (diffRemoved.length) {
          that._notifyManagers(diffRemoved, 'removed_list_manager', request, newlist);
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
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  destroy (request, reply) {
    const List = this.app.orm.List;
    const User = this.app.orm.User;

    this.log.debug('[ListController] (destroy) model = list, query =', request.query, { request: request});
    const that = this;

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
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

};
