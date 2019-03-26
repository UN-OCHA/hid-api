

const Boom = require('boom');
const _ = require('lodash');
const List = require('../models/List');
const User = require('../models/User');
const NotificationService = require('../services/NotificationService');
const ListController = require('./ListController');

/**
 * @module WebhooksController
 * @description Generated Trails.js Controller.
 */

// Notify users of a new disaster
async function _notifyNewDisaster(disaster) {
  if (disaster.metadata.operation && disaster.metadata.operation.length) {
    let operation = {};
    for (let i = 0, len = disaster.metadata.operation.length; i < len; i += 1) {
      operation = disaster.metadata.operation[i];
      /* eslint no-await-in-loop: "off" */
      const list = await List.findOne({ remote_id: operation.id });
      if (!list) {
        throw new Error('List not found');
      }
      const users = await User.find({
        operations: { $elemMatch: { list: list._id, deleted: false } },
      });
      const notification = { type: 'new_disaster', params: { list: disaster } };
      await NotificationService.sendMultiple(users, notification);
    }
  }
}

function _parseList(listType, language, item) {
  let visibility = '';
  let tmpList = {};
  visibility = 'all';
  if (item.hid_access && item.hid_access === 'closed') {
    visibility = 'verified';
  }
  let { label } = item;
  const acronym = item.acronym ? item.acronym : '';
  if (listType === 'bundle' || listType === 'office') {
    if (item.operation[0].label) {
      label = `${item.operation[0].label}: ${item.label}`;
    } else {
      label = `Global: ${item.label}`;
    }
  }
  tmpList = {
    label,
    acronym,
    type: listType,
    visibility,
    joinability: 'public',
    remote_id: item.id,
    metadata: item,
  };

  if (listType === 'bundle') {
    return List
      .findOne({ type: 'operation', remote_id: item.operation[0].id })
      .then((op) => {
        if (op) {
          if (op.metadata.hid_access) {
            if (op.metadata.hid_access === 'open') {
              tmpList.visibility = 'all';
            } else if (op.metadata.hid_access === 'closed') {
              tmpList.visibility = 'verified';
            }
          }
        }
        return tmpList;
      });
  }

  return new Promise((resolve) => {
    resolve(tmpList);
  });
}

function _parseListLanguage(alist, label, acronym, language) {
  const list = alist;
  let labelFound = false;
  if (list.labels && list.labels.length) {
    for (let i = 0; i < list.labels.length; i += 1) {
      if (list.labels[i].language === language) {
        labelFound = true;
        list.labels[i].text = label;
      }
    }
  } else {
    list.labels = [];
  }
  if (!labelFound) {
    list.labels.push({ language, text: label });
  }

  // Update acronymsOrNames
  if (!list.acronymsOrNames) {
    list.acronymsOrNames = {};
  }

  list.acronymsOrNames[language] = label;

  let acronymFound = false;
  if (list.acronyms && list.acronyms.length) {
    for (let j = 0; j < list.acronyms.length; j += 1) {
      if (list.acronyms[j].language === language) {
        acronymFound = true;
        list.acronyms[j].text = acronym;
        if (list.acronymsOrNames) {
          list.acronymsOrNames[language] = acronym;
        }
      }
    }
  } else {
    list.acronyms = [];
  }
  if (!acronymFound) {
    list.acronyms.push({ language, text: acronym });
    if (acronym !== '') {
      list.acronymsOrNames[language] = acronym;
    }
  }
}

module.exports = {

  // Receive events from hrinfo and act upon it
  async hrinfo(request, reply) {
    const listTypes = [
      'operation',
      'bundle',
      'organization',
      'functional_role',
      'office',
    ];
    const event = request.headers['x-hrinfo-event'] ? request.headers['x-hrinfo-event'] : '';
    const entity = request.payload.entity ? request.payload.entity : '';
    const resource = request.payload.type ? request.payload.type : '';
    const language = request.payload.language ? request.payload.language : 'en';
    const translations = request.payload.translations ? request.payload.translations : ['en'];
    if (!event || !entity || !resource) {
      throw Boom.badRequest();
    }
    const listType = resource.substring(0, resource.length - 1);
    if (listTypes.indexOf(listType) === -1) {
      throw Boom.badRequest();
    }
    if (event === 'create' || event === 'update') {
      const inactiveOps = [2782, 2785, 2791, 38230];
      if ((listType === 'operation'
        && entity.status !== 'inactive'
        && inactiveOps.indexOf(entity.id) === -1
        && entity.hid_access !== 'inactive')
        || (listType === 'bundle'
        && entity.hid_access !== 'no_list')
        || (listType !== 'operation'
        && listType !== 'bundle')) {
        let gList = {}; let list2 = {}; let
          updateUsers = false;
        const list = await List.findOne({ type: listType, remote_id: entity.id });
        gList = list;
        const newList = await _parseList(listType, language, entity);
        if (!gList) {
          _parseListLanguage(newList, newList.label, newList.acronym, language);
          list2 = await List.create(newList);
        } else {
          if (newList.name !== gList.name || newList.visibility !== gList.visibility) {
            updateUsers = true;
          }
          // Do not change list visibility or joinability if the list is already there
          delete newList.visibility;
          delete newList.joinability;
          _parseListLanguage(gList, newList.label, newList.acronym, language);
          if (language !== 'en') {
            delete newList.label;
            delete newList.acronym;
          }
          // Handle translations for lists with no translation in hrinfo
          if (gList.names.length) {
            gList.names.forEach((elt) => {
              if (translations.indexOf(elt.language) === -1) {
                _parseListLanguage(gList, newList.label, newList.acronym, elt.language);
              }
            });
          }
          _.merge(gList, newList);
          if (gList.deleted) {
            gList.deleted = false;
          }
          gList.markModified('metadata');
          list2 = await gList.save();
        }
        if (!gList && list2.type === 'disaster' && event === 'create') {
          _notifyNewDisaster(list2);
        } else if (updateUsers) {
          const criteria = {};
          criteria[`${list2.type}s.list`] = list2._id.toString();
          const users = await User.find(criteria);
          let user = {};
          for (let i = 0; i < users.length; i += 1) {
            user = users[i];
            user.updateCheckins(list);
            await user.save();
          }
        }
        if (list2.type === 'operation') {
          const lists = await List.find({ 'metadata.operation.id': list2.remote_id.toString() });
          for (let i = 0; i < lists.length; i += 1) {
            const group = lists[i];
            const groupIndex = group.languageIndex('labels', language);
            const listIndex = list2.languageIndex('labels', language);
            group.labels[groupIndex].text = `${list2.labels[listIndex].text}: ${group.metadata.label}`;
            group.label = `${list2.label}: ${group.metadata.label}`;
            await group.save();
          }
        }
        return list2;
      }
      throw Boom.badRequest();
    } else if (event === 'delete') {
      const list = await List.findOne({ type: listType, remote_id: entity.id });
      if (!list) {
        throw Boom.badRequest();
      } else {
        request.params.id = list._id.toString();
        return ListController.destroy(request, reply);
      }
    }
    throw Boom.badRequest();
  },

};
