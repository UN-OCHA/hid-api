'use strict';

const Controller = require('trails/controller');

/**
 * @module CronController
 * @description Generated Trails.js Controller.
 */
module.exports = class CronController extends Controller{

  synchronizeGoogleSpreadsheets (request, reply) {
    this.app.log.info('Synchronizing google spreadsheets');
    const GSSSync = this.app.orm.GSSSync;

    const stream = GSSSync
      .find({})
      .cursor();

    stream.on('data', function(gsssync) {
      this.pause();
      const that = this;
      this.app.controllers.GSSSyncController.syncSpreadsheet(gsssync)
        .then(resp => {
          that.resume();
        })
        .catch(err => {
          that.resume();
        });
    });

    stream.on('end', function () {
      reply().code(204);
    });
  }

};
