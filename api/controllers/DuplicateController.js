'use strict';

const Controller = require('trails/controller');
const async = require('async');

/**
 * @module DuplicateController
 * @description Generated Trails.js Controller.
 */
module.exports = class DuplicateController extends Controller{
  // Find duplicates
  find (request, reply) {
    const Duplicate = this.app.orm.Duplicate;
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query);
    const criteria = this.app.packs.hapi.getCriteriaFromQuery(request.query);

    let that = this;
    let query = Duplicate.find(criteria);
    if (options.limit) {
      query.limit(parseInt(options.limit));
    }
    if (options.offset) {
      query.skip(parseInt(options.offset));
    }
    if (options.sort) {
      query.sort(options.sort);
    }
    query
      .then((results) => {
        return Duplicate
          .count(criteria)
          .then((number) => {
            return {result: results, number: number};
          });
      })
      .then((result) => {
        return reply(result.result).header('X-Total-Count', result.number);
      })
      .catch((err) => {
        that.app.services.ErrorService.handle(err, reply);
      });
  }

  // Generate the duplicates
  generate (request, reply) {
    reply();
    const User = this.app.orm.User;
    const Duplicate = this.app.orm.Duplicate;
    this.app.log.info('Generating duplicates');
    var stream = User.find({}).stream();

    var app = this.app;
    stream.on('data', function(user) {
      this.pause();
      let that = this;
      app.log.info('Looking for duplicates of ' + user.email);
      if (user.emails && user.emails.length) {
        async.eachSeries(user.emails, function (email, callback) {
          User
            .find({'emails.email': email.email})
            .then(users => {
              if (users && users.length > 1) {
                var dup = {
                  user: user,
                  duplicates: users
                };
                Duplicate
                  .create(dup)
                  .then((duplicate) => {
                    callback();
                  });
              }
              else {
                callback();
              }
            });
        }, function (err) {
          that.resume();
        });
      }
      else {
        this.resume();
      }
    });
  }

  // Delete a duplicated user, and the duplicate associated
  delete (request, reply) {
    const User = this.app.orm.User;
    const Duplicate = this.app.orm.Duplicate;
    let that = this;
    User
      .remove({_id: request.params.id}, function (err) {
        Duplicate
          .findOne({duplicates: request.params.id})
          .then((dup) => {
            if (dup.duplicates.length === 2) {
              dup.remove();
            }
            reply();
          })
          .catch(err => {
            that.app.services.ErrorService.handle(err, reply);
          });
      });
  }
};
