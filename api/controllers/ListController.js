'use strict'

const Controller = require('trails-controller')
const Boom = require('boom')

/**
 * @module ListController
 * @description Generated Trails.js Controller.
 */
module.exports = class ListController extends Controller{

  find (request, reply) {
    const FootprintService = this.app.services.FootprintService
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query)
    const criteria = this.app.packs.hapi.getCriteriaFromQuery(request.query)
    let response, count

    if (!options.populate) options.populate = "owner managers"

    if (!options.sort) options.sort = "name"

    // Search with contains when searching in name or full_name
    if (criteria['name']) criteria['name'] = new RegExp(criteria['name'], "i")
    if (criteria['label']) criteria['label'] = new RegExp(criteria['label'], "i")

    this.log.debug('[ListController] (find) model = list, criteria =', request.query, request.params.id,
      'options =', options)

    var findCallback = function (result) {
      if (!result) return Boom.notFound()
      return result
    };

    // List visiblity
    var currentUser = request.params.currentUser;

    if (request.params.id) {
      response = FootprintService.find('list', request.params.id, options)
      reply(
        response.then(function (result) {
          if (!result) return Boom.notFound()
          var isManager = result.managers.filter(function (elt) {
            return elt._id == currentUser._id;
          });

          if (result.visibility == "all" || 
             currentUser.is_admin || 
             (result.visibility == "verified" && currentUser.verified) || 
             (result.visibility == "me" && (result.owner._id == currentUser._id || isManager.length > 0)) ) {
               console.log('returning result');
               return result;
           }
           else {
             return Boom.forbidden();
           }
        })
      )
    }
    else {
      if (!currentUser.is_admin) {
        criteria.$or = [
          {visibility: "all"},
          {owner: currentUser._id},
          {managers: currentUser._id},
        ];
        if (currentUser.verified) {
          criteria.$or.push({visibility: "verified"});
        }
      }

      response = FootprintService.find('list', criteria, options)
      count = FootprintService.count('list', criteria)
      count.then(number => {
        reply(response.then(findCallback)).header('X-Total-Count', number)
      })
    }
  }

  update (request, reply) {
    const FootprintService = this.app.services.FootprintService
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query)
    const criteria = this.app.packs.hapi.getCriteriaFromQuery(request.query)

    if (!options.populate) options.populate = "owner managers"

    this.log.debug('[ListController] (update) model = list, criteria =', request.query, request.params.id,
      ', values = ', request.payload)

    if (request.params.id) {
      reply(FootprintService.update('list', request.params.id, request.payload, options))
    }
    else {
      reply(FootprintService.update('list', criteria, request.payload, options))
    }
  }


  destroy (request, reply) {
    const FootprintService = this.app.services.FootprintService
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query)
    const criteria = this.app.packs.hapi.getCriteriaFromQuery(request.query)

    this.log.debug('[ListController] (destroy) model = list, query =', request.query)

    if (request.params.id) {
      FootprintService.destroy('listuser', {list: request.params.id}, options)
      reply(FootprintService.destroy('list', request.params.id, options))
    }
    else {
      reply(FootprintService.destroy('list', criteria, options))
    }
  }

}

