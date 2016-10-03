'use strict'

const Controller = require('trails-controller')

/**
 * @module UserController
 * @description Generated Trails.js Controller.
 */
module.exports = class UserController extends Controller{

  find (request, reply) {
    const FootprintService = this.app.services.FootprintService
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query)
    const criteria = this.app.packs.hapi.getCriteriaFromQuery(request.query)
    let response, count

    if (!options.populate) options.populate = "favoriteLists";

    if (criteria['roles.id']) {
      criteria['roles.id'] = parseInt(criteria['roles.id']);
    }

    if (criteria['name']) {
      criteria['name'] = new RegExp(criteria['name'], "i")
    }

    if (criteria['country']) {
      criteria['location.country.id'] = criteria['country'];
      delete criteria['country'];
    }

    this.log.debug('[FootprintController] (find) model = user, criteria =', request.query, request.params.id,
      'options =', options)

    if (request.params.id) {
      response = FootprintService.find('user', request.params.id, options)
    }
    else {
      response = FootprintService.find('user', criteria, options)
    }
    count = FootprintService.count('user', criteria)

    count.then(number => {
      reply(
        response
          .then(result => {
            if (!result) return Boom.notFound()

            return result
          })
          .catch(function (err) { that.log.debug(err); })
        )
        .header('X-Total-Count', number)
    })
  }

  update (request, reply) {
    const FootprintService = this.app.services.FootprintService
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query)
    const criteria = this.app.packs.hapi.getCriteriaFromQuery(request.query)

    if (!options.populate) options.populate = "favoriteLists"

    this.log.debug('[UserController] (update) model = user, criteria =', request.query, request.params.id,
      ', values = ', request.payload)

    if (request.params.id) {
      reply(FootprintService.update('user', request.params.id, request.payload, options))
    }
    else {
      reply(FootprintService.update('user', criteria, request.payload, options))
    }
  }

  destroy (request, reply) {
    const FootprintService = this.app.services.FootprintService
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query)
    const criteria = this.app.packs.hapi.getCriteriaFromQuery(request.query)

    this.log.debug('[UserController] (destroy) model = user, query =', request.query)

    if (request.params.id) {
      FootprintService.destroy('listuser', {user: request.params.id}, options)
      reply(FootprintService.destroy('user', request.params.id, options))
    }
    else {
      reply(FootprintService.destroy('user', criteria, options))
    }
  }

}

