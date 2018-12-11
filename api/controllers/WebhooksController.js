'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');
const _ = require('lodash');

/**
 * @module WebhooksController
 * @description Generated Trails.js Controller.
 */
module.exports = class WebhooksController extends Controller{

  // Receive events from hrinfo and act upon it
  hrinfo (request, reply) {
    const listTypes = [
      'operation',
      'bundle',
      'disaster',
      'organization',
      'functional_role',
      'office'
    ];
    const List = this.app.orm.List;
    const User = this.app.orm.User;
    const ListController = this.app.controllers.ListController;
    const that = this;
    const event = request.headers['x-hrinfo-event'] ? request.headers['x-hrinfo-event'] : '';
    const entity = request.payload.entity ? request.payload.entity : '';
    const resource = request.payload.type ? request.payload.type : '';
    const language = request.payload.language ? request.payload.language : 'en';
    const translations = request.payload.translations ? request.payload.translations : ['en'];
    if (!event || !entity || !resource) {
      return reply(Boom.badRequest());
    }
    const listType = resource.substring(0, resource.length - 1);
    if (listTypes.indexOf(listType) === -1) {
      return reply(Boom.badRequest());
    }
    if (event !== 'create' && event !== 'update' && event !== 'delete') {
      return reply(Boom.badRequest());
    }
    if (event === 'create' || event === 'update') {
      const inactiveOps = [2782,2785,2791,38230];
      if ((listType === 'operation' &&
        entity.status !== 'inactive' &&
        inactiveOps.indexOf(entity.id) === -1 &&
        entity.hid_access !== 'inactive') ||
        (listType === 'bundle' &&
        entity.hid_access !== 'no_list') ||
        (listType !== 'operation' &&
        listType !== 'bundle')) {
        let gList = {}, updateUsers = false;
        List
          .findOne({type: listType, remote_id: entity.id})
          .then(list => {
            gList = list;
            return that._parseList(listType, language, entity);
          })
          .then(newList => {
            if (!gList) {
              that._parseListLanguage(newList, newList.label, newList.acronym, language);
              return List.create(newList);
            }
            else {
              if (newList.name !== gList.name || newList.visibility !== gList.visibility) {
                updateUsers = true;
              }
              // Do not change list visibility or joinability if the list is already there
              delete newList.visibility;
              delete newList.joinability;
              that._parseListLanguage(gList, newList.label, newList.acronym, language);
              if (language !== 'en') {
                delete newList.label;
                delete newList.acronym;
              }
              // Handle translations for lists with no translation in hrinfo
              if (gList.names.length) {
                gList.names.forEach(function (elt) {
                  if (translations.indexOf(elt.language) === -1) {
                    that._parseListLanguage(gList, newList.label, newList.acronym, elt.language);
                  }
                });
              }
              _.merge(gList, newList);
              if (gList.deleted) {
                gList.deleted = false;
              }
              gList.markModified('metadata');
              return gList.save();
            }
          })
          .then(list => {
            if (!gList && list.type === 'disaster' && event === 'create') {
              that._notifyNewDisaster(list);
            }
            else {
              if (updateUsers) {
                const criteria = {};
                criteria[list.type + 's.list'] = list._id.toString();
                User
                  .find(criteria)
                  .then(users => {
                    let user = {};
                    for (let i = 0; i < users.length; i++) {
                      user = users[i];
                      user.updateCheckins(list);
                      user.save();
                    }
                  });
              }
            }
            return list;
          })
          .then(list => {
            if (list.type === 'operation') {
              List
                .find({'metadata.operation[0].id': list.remote_id})
                .then(lists => {
                  lists.forEach(function (group) {
                    group.label = list.label + ': ' + group.label;
                    group.save();
                  });
            }
            return reply(list);
          })
          .catch(err => {
            that.app.services.ErrorService.handle(err, request, reply);
          });
      }
      else {
        return reply(Boom.badRequest());
      }
    }
    else if (event === 'delete') {
      List
        .findOne({type: listType, remote_id: entity.id})
        .then(list => {
          if (!list) {
            return reply(Boom.badRequest());
          }
          else {
            request.params.id = list._id.toString();
            ListController.destroy(request, reply);
          }
        })
        .catch(err => {
          that.app.services.ErrorService.handle(err, request, reply);
        });
    }

  }

  // Notify users of a new disaster
  _notifyNewDisaster (disaster) {
    const app = this.app;
    const List = app.orm.list;
    const User = app.orm.User;
    const NotificationService = app.services.NotificationService;
    if (disaster.metadata.operation && disaster.metadata.operation.length) {
      let operation = {};
      for (let i = 0, len = disaster.metadata.operation.length; i < len; i++) {
        operation = disaster.metadata.operation[i];
        List
          .findOne({remote_id: operation.id})
          .then((list) => {
            if (!list) {
              throw new Error('List not found');
            }
            return User
              .find({operations: { $elemMatch: { list: list._id, deleted: false }} });
          })
          .then((users) => {
            const notification = {type: 'new_disaster', params: {list: disaster}};
            app.log.debug('Notifying ' + users.length + ' users of a new disaster: ' + disaster.label);
            NotificationService.sendMultiple(users, notification, () => { });
          })
          .catch((err) => {});
      }
    }
  }

  _parseList (listType, language, item) {
    const List = this.app.orm.List;
    let visibility = '', label = '', acronym = '', tmpList = {};
    visibility = 'all';
    if (item.hid_access && item.hid_access === 'closed') {
      visibility = 'verified';
    }
    label = item.label;
    if (listType === 'bundle' || listType === 'office') {
      if (item.operation[0].label) {
        label = item.operation[0].label + ': ' + item.label;
      }
      else {
        label = 'Global: ' + item.label;
      }
    }
    if (listType === 'organization' && item.acronym) {
      acronym = item.acronym;
    }
    tmpList = {
      label: label,
      acronym: acronym,
      type: listType,
      visibility: visibility,
      joinability: 'public',
      remote_id: item.id,
      metadata: item
    };

    if (listType === 'bundle') {
      return List
        .findOne({type: 'operation', remote_id: item.operation[0].id})
        .then((op) => {
          if (op) {
            if (op.metadata.hid_access) {
              if (op.metadata.hid_access === 'open') {
                tmpList.visibility = 'all';
              }
              else if (op.metadata.hid_access === 'closed') {
                tmpList.visibility = 'verified';
              }
            }
          }
          return tmpList;
        });
    }
    else {
      return new Promise((resolve, reject) => {
        resolve(tmpList);
      });
    }
  }

  _parseListLanguage (list, label, acronym, language) {
    let labelFound = false;
    if (list.labels && list.labels.length) {
      for (let i = 0; i < list.labels.length; i++) {
        if (list.labels[i].language === language) {
          labelFound = true;
          list.labels[i].text = label;
        }
      }
    }
    else {
      list.labels = [];
    }
    if (!labelFound) {
      list.labels.push({language: language, text: label});
    }

    // Update acronymsOrNames
    if (list.acronymsOrNames) {
      list.acronymsOrNames[language] = label;
    }

    let acronymFound = false;
    if (list.acronyms && list.acronyms.length) {
      for (let j = 0; j < list.acronyms.length; j++) {
        if (list.acronyms[j].language === language) {
          acronymFound = true;
          list.acronyms[j].text = acronym;
          if (list.acronymsOrNames) {
            list.acronymsOrNames[language] = acronym;
          }
        }
      }
    }
    else {
      list.acronyms = [];
    }
    if (!acronymFound) {
      list.acronyms.push({language: language, text: acronym});
      list.acronymsOrNames[language] = acronym;
    }
  }

};
