'use strict';

const Controller = require('trails/controller');
const languages = ['en', 'fr', 'es'];

/**
 * @module DefaultController
 *
 * @description Default Controller included with a new Trails app
 * @see {@link http://trailsjs.io/doc/api/controllers}
 * @this TrailsApp
 */
module.exports = class DefaultController extends Controller {

  migrateUsers (request, reply) {
    reply();
    this.app.config.migrate.migrate(this.app);
  }

  migrateAuth (request, reply) {
    reply();
    this.app.config.migrate.migrateAuth(this.app);
  }

  migrateLists (request, reply) {
    reply();
    this.app.config.migrate.migrateLists(this.app);
  }

  migrateServices (request, reply) {
    reply();
    this.app.config.migrate.migrateServices(this.app);
  }

  importLists (request, reply) {
    reply();
    this.app.config.cron.importLists(this.app);
  }

  setUserNames (request, reply) {
    reply();
      const User = this.app.orm.User;
      const stream = User
        .find()
        .stream();
      let number = 0;
      stream.on('data', function(user) {
        console.log('Running user ' + number);
        number++;
        /*let name = '';
        if (user.middle_name) {
          name = user.given_name + ' ' + user.middle_name + ' ' + user.family_name;
        }
        else {
          name = user.given_name + ' ' + user.family_name;
        }
        User
          .update({ _id: user._id}, {$set: {name: name}});*/
        user.save();
      });
  }

  setListNames (request, reply) {
    reply();

    const List = this.app.orm.List;
    const stream = List
      .find()
      .stream();
    let number = 0;
    stream.on('data', function(list) {
      console.log('Running list ' + number);
      number++;
      /*if (list.acronym) {
        list.name = list.label + ' (' + list.acronym + ')';
      }
      else {
        list.name = list.label;
      }
      const that = list;
      languages.forEach(function (lang) {
        const labelIndex = that.languageIndex('labels', lang);
        const nameIndex = that.languageIndex('names', lang);
        const acronymIndex = that.languageIndex('acronyms', lang);
        let name = '';
        if (labelIndex !== -1) {
          if (acronymIndex !== -1 && that.acronyms[acronymIndex].text !== '') {
            name = that.labels[labelIndex].text + ' (' + that.acronyms[acronymIndex].text + ')';
          }
          else {
            name = that.labels[labelIndex].text;
          }
          if (nameIndex !== -1) {
            that.names[nameIndex].text = name;
          }
          else {
            that.names.push({language: lang, text: name});
          }
        }
      });*/
      list.save();
    });
  }
};
