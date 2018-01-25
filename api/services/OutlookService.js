'use strict';

const Service = require('trails/service');

/**
 * @module OutlookService
 * @description Outlook Service
 */
module.exports = class OutlookService extends Service {

  createGroup (user, listId, callback) {
    const List = this.app.orm.List;
    List
      .findOne({ _id: listId })
      .then(list => {
        if (!list) {
          return callback(new Error('List not found'));
        }
        const authClient = this.getAuthClient(user);
        const sheets = Google.sheets('v4');
        let request = {
          resource: {
            properties: {
              title: list.name
            },
            sheets: [{
              properties: {
                gridProperties: {
                  rowCount: 10000
                }
              }
            }]
          },
          auth: authClient
        };
        sheets.spreadsheets.create(request, function (err, response) {
          if (err) {
            return callback(err);
          }
          callback(null, response.spreadsheetId);
        });
      })
      .catch(err => {
        return callback(err);
      });
  }

};
