'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');
const _ = require('lodash');
const async = require('async');

/**
 * @module ListController
 * @description Generated Trails.js Controller.
 */
module.exports = class ListController extends Controller{

  _getAdminOnlyAttributes () {
    return this._getSchemaAttributes('adminOnlyAttributes', 'adminOnly');
  }

  _getReadonlyAttributes () {
    return this._getSchemaAttributes('readonlyAttributes', 'readonly');
  }

  _getSchemaAttributes (variableName, attributeName) {
    if (!this[variableName] || this[variableName].length === 0) {
      const Model = this.app.orm.user;
      this[variableName] = [];
      var that = this;
      Model.schema.eachPath(function (path, options) {
        if (options.options[attributeName]) {
          that[variableName].push(path);
        }
      });
    }
    return this[variableName];
  }

  _removeForbiddenAttributes (request) {
    var forbiddenAttributes = [];
    if (!request.params.currentUser || !request.params.currentUser.is_admin) {
      forbiddenAttributes = forbiddenAttributes.concat(this._getReadonlyAttributes(), this._getAdminOnlyAttributes());
    }
    else {
      forbiddenAttributes = forbiddenAttributes.concat(this._getReadonlyAttributes());
    }
    // Do not allow forbiddenAttributes to be updated directly
    for (var i = 0, len = forbiddenAttributes.length; i < len; i++) {
      if (request.payload[forbiddenAttributes[i]]) {
        delete request.payload[forbiddenAttributes[i]];
      }
    }
  }

  create (request, reply) {
    request.params.model = 'list';
    const FootprintController = this.app.controllers.FootprintController;
    this._removeForbiddenAttributes(request);
    request.payload.owner = request.params.currentUser._id;
    FootprintController.create(request, reply);
  }

  find (request, reply) {
    const FootprintService = this.app.services.FootprintService;
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query);
    const criteria = this.app.packs.hapi.getCriteriaFromQuery(request.query);
    const List = this.app.orm.List;
    const ListUser = this.app.orm.ListUser;
    let response, count;

    if (!options.populate) {
      options.populate = 'owner managers';
    }

    if (!options.sort) {
      options.sort = 'name';
    }

    // Search with contains when searching in name or label
    if (criteria.name) {
      criteria.name = criteria.name.replace(/\(|\\|\^|\.|\||\?|\*|\+|\)|\[|\{/, '');
      criteria.name = new RegExp(criteria.name, 'i');
    }
    if (criteria.label) {
      criteria.label = criteria.label.replace(/\(|\\|\^|\.|\||\?|\*|\+|\)|\[|\{/, '');
      criteria.label = new RegExp(criteria.label, 'i');
    }

    // Do not show deleted lists
    criteria.deleted = {$in: [false, null]};

    this.log.debug('[ListController] (find) model = list, criteria =', request.query, request.params.id, 'options =', options);

    var findCallback = function (result) {
      if (!result) {
        return Boom.notFound();
      }
      return result;
    };

    // List visiblity
    var currentUser = request.params.currentUser,
      that = this;

    if (request.params.id) {
      List
        .findOne({_id: request.params.id, deleted: criteria.deleted })
        .populate(options.populate)
        .then(result => {
          if (!result) {
            throw Boom.notFound();
          }

          result.isVisibleTo(request.params.currentUser, ListUser, function (visible) {
            var out = result.toJSON();
            out.visible = visible;
            return reply(out);
          });
        })
        .catch(err => { that.app.services.ErrorService.handle(err, reply); });
    }
    else {
      response = FootprintService.find('list', criteria, options);
      count = FootprintService.count('list', criteria);
      response
        .then((result) => {
          return count
            .then((number) => {
              return {result: result, number: number};
            });
        })
        .then((result) => {
          var out = [], tmp = {};
          async.each(result.result, function (list, next) {
            list.isVisibleTo(request.params.currentUser, ListUser, function (visible) {
              tmp = list.toJSON();
              tmp.visible = visible;
              out.push(tmp);
              next();
            });
          }, function (err) {
            return reply(out).header('X-Total-Count', result.number);
          });
        })
        .catch((err) => {
          that.app.services.ErrorService.handle(err, reply);
        });
    }
  }

  _notifyManagers(uids, type, request) {
    const User = this.app.orm.user;
    var that = this;
    User
      .find({_id: {$in: uids}})
      .exec()
      .then((users) => {
        for (var i = 0, len = users.length; i < len; i++) {
          that.app.services.NotificationService
            .send({type: type, user: users[i], createdBy: request.params.currentUser, params: { list: request.payload } }, () => {});
        }
      })
      .catch((err) => { that.log.error(err); });
  }

  update (request, reply) {
    const FootprintService = this.app.services.FootprintService;
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query);
    const criteria = this.app.packs.hapi.getCriteriaFromQuery(request.query);
    const Model = this.app.orm.list;
    const User = this.app.orm.user;

    this._removeForbiddenAttributes(request);

    if (!options.populate) {
      options.populate = 'owner managers';
    }

    this.log.debug('[ListController] (update) model = list, criteria =', request.query, request.params.id, ', values = ', request.payload);

    var that = this;
    Model
      .findOneAndUpdate({_id: request.params.id}, request.payload, options)
      .exec()
      .then((doc) => {
        var diffAdded = _.difference(request.payload.managers, doc.managers);
        var diffRemoved = _.difference(doc.managers, request.payload.managers);
        if (diffAdded.length) {
          that._notifyManagers(diffAdded, 'added_list_manager', request);
        }
        if (diffRemoved.length) {
          that._notifyManagers(diffRemoved, 'removed_list_manager', request);
        }
        return reply(request.payload);
      })
      .catch((err) => {
        that.app.services.ErrorService.handle(err, reply);
      });
  }


  destroy (request, reply) {
    const List = this.app.orm.List,
      ListUser = this.app.orm.ListUser;

    this.log.debug('[ListController] (destroy) model = list, query =', request.query);
    let that = this;

    List
      .findOne({ _id: request.params.id })
      .then(record => {
        if (!record) {
          throw new Error(Boom.notFound());
        }
        // Set deleted to true
        record.deleted = true;
        return record
          .save()
          .then(() => {
            return record;
          });
      })
      .then((record) => {
        reply(record);
        // Remove all checkins from users in this list
        ListUser
          .find({list: request.params.id})
          .populate('list user')
          .then((lus) => {
            var listType = '',
              lu = {};
            for (var i = 0; i < lus.length; i++) {
              lu = lus[i];
              listType = lu.list.type;
              // Remove references in users
              lu.user[listType + 's'] = lu.user[listType + 's'].filter(function (obj) {
                return obj._id.toString() !== lu._id.toString();
              });
              if (listType === 'organization' && lu.user.organization._id.toString() === lu._id.toString()) {
                lu.user.organization = {};
              }
              lu.user.save();
              // Set listuser to deleted
              lu.deleted = true;
              lu.save();
            }
          });
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, reply);
      });
  }

};
