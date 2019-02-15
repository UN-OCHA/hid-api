'use strict';

const fs = require('fs');
const {OAuth2Client} = require('google-auth-library');
const {google} = require('googleapis');
const Boom = require('boom');
const GSSSync = require('../models/GSSSync');
const List = require('../models/List');
const User = require('../models/User');

/**
* @module GSSSyncService
* @description GSSSync Service
*/
function getRowFromUser (elt) {
  const organization = elt.organization ? elt.organization.name : '';
  let country = '',
  region = '',
  skype = '',
  bundles = '',
  roles = '';
  if (elt.location && elt.location.country) {
    country = elt.location.country.name;
  }
  if (elt.location && elt.location.region) {
    region = elt.location.region.name;
  }
  if (elt.voips && elt.voips.length) {
    elt.voips.forEach(function (voip) {
      if (voip.type === 'Skype') {
        skype = voip.username;
      }
    });
  }
  if (elt.bundles && elt.bundles.length) {
    elt.bundles.forEach(function (bundle) {
      bundles += bundle.name + ';';
    });
  }
  if (elt.functional_roles && elt.functional_roles.length) {
    elt.functional_roles.forEach(function (role) {
      roles += role.name + ';';
    });
  }
  return [
    elt._id,
    elt.given_name,
    elt.family_name,
    elt.job_title,
    organization,
    bundles,
    roles,
    country,
    region,
    elt.phone_number,
    skype,
    elt.email,
    elt.status
  ];
};

function getAuthClient (user) {
  // Authenticate with Google
  const creds = JSON.parse(fs.readFileSync('keys/client_secrets.json'));
  const authClient = new OAuth2Client(creds.web.client_id, creds.web.client_secret, 'postmessage');
  authClient.setCredentials(user.googleCredentials);
  return authClient;
}

async function writeUser (gsssync, authClient, user, index) {
  const sheets = google.sheets('v4');
  const values = getRowFromUser(user);
  const body = {
    values: [values]
  };
  try {
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: gsssync.spreadsheet,
      range: 'A' + index + ':M' + index,
      valueInputOption: 'RAW',
      resource: body,
      auth: authClient
    });
  }
  catch (err) {
    if (err.code === 404) {
      // Spreadsheet has been deleted, remove the synchronization
      gsssync.remove();
    }
    throw err;
  }
};

async function addUser (agsssync, user) {
  const sheets = google.sheets('v4');
  const gsssync = await agsssync
  .populate('list user')
  .execPopulate();
  const authClient = getAuthClient();
  // Find users
  const criteria = gsssync.getUserCriteria();
  if (Object.keys(criteria).length === 0) {
    throw Boom.unauthorized('You are not authorized to view this list');
  }
  const users = await User
  .find(criteria)
  .select(GSSSync.getUserAttributes())
  .sort('name')
  .lean();
  try {
    const column = await sheets.spreadsheets.values.get({
      spreadsheetId: gsssync.spreadsheet,
      range: 'A:A',
      auth: authClient
    });
    if (!column || !column.values) {
      throw Boom.badImplementation('column or column.values is undefined on spreadsheet ' + gsssync.spreadsheet);
    }
    let row = 0, index = 0, firstLine = true;
    column.values.forEach(function (elt) {
      // Skip first line as it's the headers
      if (firstLine === true) {
        firstLine = false;
      }
      else {
        if (elt[0] !== users[row]._id.toString() && index === 0) {
          index = row + 1;
        }
        row++;
      }
    });
    if (index !== 0) {
      const body = {
        requests: [{
          insertDimension: {
            range: {
              sheetId: gsssync.sheetId,
              dimension: 'ROWS',
              startIndex: index,
              endIndex: index + 1
            }
          }
        }]
      };
      const response = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: gsssync.spreadsheet,
        resource: body,
        auth: authClient
      });
      const writeIndex = index + 1;
      await writeUser(gsssync, authClient, user, writeIndex);
    }
    else {
      throw Boom.badRequest('Could not add user');
    }
  }
  catch (err) {
    if (err.code === 404) {
      // Spreadsheet has been deleted, remove the synchronization
      gsssync.remove();
    }
    throw err;
  }
};

async function deleteUser (agsssync, hid) {
  const sheets = google.sheets('v4');
  const gsssync = await agsssync
  .populate('list user')
  .execPopulate();
  const authClient = getAuthClient();
  try {
    const column = await sheets.spreadsheets.values.get({
      spreadsheetId: gsssync.spreadsheet,
      range: 'A:A',
      auth: authClient
    });
    if (!column || !column.values) {
      throw Boom.badImplementation('column or column.values is undefined on spreadsheet ' + gsssync.spreadsheet);
    }
    let row = 0, index = 0;
    column.values.forEach(function (elt) {
      if (elt[0] === hid) {
        index = row;
      }
      row++;
    });
    if (index !== 0) {
      const body = {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: gsssync.sheetId,
              dimension: 'ROWS',
              startIndex: index,
              endIndex: index + 1
            }
          }
        }]
      };
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: gsssync.spreadsheet,
        resource: body,
        auth: authClient
      });
    }
    else {
      throw Boom.badRequest('Could not find user');
    }
  }
  catch (err) {
    if (err.code === 404) {
      // Spreadsheet has been deleted, remove the synchronization
      gsssync.remove();
    }
    throw err;
  }
};

async function updateUser (agsssync, user) {
  const sheets = google.sheets('v4');
  const gsssync = await agsssync
  .populate('list user')
  .execPopulate();
  const authClient = getAuthClient();
  try {
    const column = await sheets.spreadsheets.values.get({
      spreadsheetId: gsssync.spreadsheet,
      range: 'A:A',
      auth: authClient
    });
    if (!column || !column.values) {
      throw new Error('column or column.values is undefined on spreadsheet ' + gsssync.spreadsheet);
    }
    let row = 0, index = 0;
    column.values.forEach(function (elt) {
      if (elt[0] === user._id.toString()) {
        index = row + 1;
      }
      row++;
    });
    if (index !== 0) {
      await writeUser(gsssync, authClient, user, index);
    }
    else {
      throw new Error('Could not find user ' + user._id.toString() + ' for spreadsheet ' + gsssync.spreadsheet);
    }
  }
  catch (err) {
    if (err.code === 404) {
      // Spreadsheet has been deleted, remove the synchronization
      gsssync.remove();
    }
    throw err;
  }
};

module.exports = {

  addUserToSpreadsheets: async function (listId, user) {
    const gsssyncs = await GSSSync.find({list: listId});
    if (gsssyncs.length) {
      const fn = async function (gsssync) {
        await addUser(gsssync, user);
      };
      const actions = gsssyncs.map(fn);
      return Promise.all(actions);
    }
  },

  deleteUserFromSpreadsheets: async function (listId, hid) {
    const gsssyncs = await GSSSync.find({list: listId});
    if (gsssyncs.length) {
      const fn = async function (gsssync) {
        await deleteUser(gsssync, hid);
      };
      const actions = gsssyncs.map(fn);
      return Promise.all(actions);
    }
  },

  synchronizeUser: async function (user) {
    // Get all lists from user
    const listIds = user.getListIds();

    // Find the gsssyncs associated to the lists
    const gsssyncs = await GSSSync.find({list: {$in: listIds}});
    if (gsssyncs.length) {
      // For each gsssync, call updateUser
      const fn = async function (gsssync) {
        await updateUser(gsssync, user);
      };
      const actions = gsssyncs.map(fn);
      return Promise.all(actions);
    }
  },

  createSpreadsheet: async function (user, listId, callback) {
    const list = await List.findOne({ _id: listId });
    if (!list) {
      throw new Error('List not found');
    }
    const authClient = getAuthClient(user);
    const sheets = google.sheets('v4');
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
    const response = await sheets.spreadsheets.create(request);
    return response;
  },

  getSheetId: async function (agsssync) {
    const gsssync = await agsssync.populate('user').execPopulate();
    const authClient = getAuthClient();
    const sheets = Google.sheets('v4');
    const sheet = await sheets.spreadsheets.get({
      spreadsheetId: gsssync.spreadsheet,
      auth: authClient
    });
    if (sheet) {
      return sheet.sheets[0].properties.sheetId;
    }
    else {
      return '';
    }
  },

  synchronizeAll: async function (agsssync) {
    const headers = GSSSync.getSpreadsheetHeaders();
    const gsssync = await gsssync.populate('list user').execPopulate();
    const authClient = getAuthClient();
    const criteria = gsssync.getUserCriteria();
    if (Object.keys(criteria).length === 0) {
      throw Boom.unauthorized('You are not authorized to view this list');
    }
    const users = await User
    .find(criteria)
    .select(GSSSync.getUserAttributes())
    .sort('name')
    .lean();
    // Export users to spreadsheet
    const data = [];
    let index = 2;
    let row = [];
    data.push({
      range: 'A1:M1',
      values: [headers]
    });
    users.forEach(function (elt) {
      row = getRowFromUser(elt);
      data.push({
        range: 'A' + index + ':M' + index,
        values: [row]
      });
      index++;
    });
    const body = {
      data: data,
      valueInputOption: 'RAW'
    };
    const sheets = google.sheets('v4');
    return sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: gsssync.spreadsheet,
      resource: body,
      auth: authClient
    });
  }

};
