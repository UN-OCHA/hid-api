// config/cron.js
const https = require('https')
const async = require('async')

module.exports = {
  jobs: {
    deleteExpiredUsers: {
      schedule: '*/60 * * * *',
      onTick: function (app) {
        const User = app.orm['user']
        var now = Date.now()
        var start = new Date(2016, 0, 1, 0, 0, 0)
        User.remove({expires: {$gt: start, $lt: now}});
      },
      onComplete: function (app) {
        app.log.info('Done deleting expired users')
      },
      start: true
    },
    deleteExpiredTokens: {
      schedule: '*/10 * * * *',
      onTick: function (app) {
        const OauthToken = app.orm.OauthToken
        var now = Date.now()
        OauthToken.remove({expires: {$lt: now }})
      }
    },
    // Import lists from Humanitarianresponse
    importLists: {
      schedule: '*/60 * * * *', // Run every 10 minutes
      onTick: function (app) {
        const List = app.orm['list']
        const listTypes = ['operation', 'bundle', 'disaster', 'organization']
        //const Cache = app.services.CacheService.getCaches(['local-cache'])
        var hasNextPage = false, pageNumber = 1, path = '';

        var _createList = function (listType, item, cb) {
          var tmpList = {}, visibility = '', label = '', acronym = '';
          if ((listType == 'operation' && item.status != 'inactive') || listType != 'operation') {
            List.findOne({type: listType, remote_id: item.id}, function (err, list) {
              if (!list) {
                visibility = 'all';
                if (item.hid_access && item.hid_access == 'closed') {
                  visibility = 'verified';
                }
                label = item.label;
                if (listType == 'bundle') {
                  label = item.operation[0].label + ': ' + item.label;
                }
                if (listType == 'organization' && item.acronym) {
                  acronym = item.acronym
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
                List.create(tmpList, function (err, li) {
                  if (err) app.log.info(err)
                  cb();
                });
              }
              else {
                cb();
              }
            });
          }
          else {
            cb();
          }
        };

        var lastPull = 0
        //Cache.then((mongoCache) => {
          //return mongoCache.get('lastPull', function (err, lastPull) {
            //if (err) app.log.info(err)
            if (!lastPull) lastPull = 0
            // For each list type
            async.eachSeries(listTypes,
              function(listType, nextType) {
                // Parse while there are pages
                async.doWhilst(function (nextPage) {
                  path = '/api/v1.0/' + listType + 's?page=' + pageNumber + '&filter[created][value]=' + lastPull + '&filter[created][operator]=>';
                  if (listType == 'organization') {
                    path = '/api/v1.0/' + listType + 's?page=' + pageNumber;
                  }
                  https.get({
                    host: 'www.humanitarianresponse.info',
                    port: 443,
                    path: path
                  }, function (response) {
                    pageNumber++;
                    var body = '';
                    response.on('data', function (d) {
                      body += d;
                    });
                    response.on('end', function() {
                      var parsed = {};
                      try {
                        parsed = JSON.parse(body);
                        hasNextPage = parsed.next ? true: false;
                        async.eachSeries(parsed.data, function (item, cb) {
                          // TODO: do not add disasters more than 2 years old
                          _createList(listType, item, cb);
                        }, function (err) {
                          setTimeout(function() {
                            app.log.info('Done loading page ' + pageNumber + ' for ' + listType);
                            nextPage();
                          }, 1000);
                        });
                      } catch (e) {
                        app.log.info('Error parsing hrinfo API: ' + e)
                      }
                    });
                  });
              }, function () {
                return hasNextPage;
              }, function (err, results) {
                pageNumber = 1;
                app.log.info('Done processing all ' + listType + 's');
                nextType();
              });
            }, function (err) {
              var currentTime = Math.round(Date.now() / 1000);
              // Keep item in cache 12 minutes (720 seconds)
              app.log.info(currentTime);
              /*mongoCache.set('lastPull', currentTime, {ttl: 720}, function (err) {
                app.log.info(err);
              });*/
              app.log.info('Done processing all list types');
            });
          //});
        //});
      },
      onComplete: function (app) {
        app.log.info('I am done');
      },
      start: true
    }
  }
}
