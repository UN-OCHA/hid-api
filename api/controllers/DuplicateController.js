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
    request.params.model = 'duplicate';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.find(request, reply);
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
};
