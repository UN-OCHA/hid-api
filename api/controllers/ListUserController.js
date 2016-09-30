'use strict'

const Controller = require('trails-controller')
const Boom = require('boom')

/**
 * @module ListUserController
 * @description Generated Trails.js Controller.
 */
module.exports = class ListUserController extends Controller{

  find (request, reply) {
    const FootprintService = this.app.services.FootprintService
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query)
    const criteria = this.app.packs.hapi.getCriteriaFromQuery(request.query)
    let response, count

    if (!options.populate) options.populate = 'user'

    this.log.debug('[ListUserController] (find) model = listuser, criteria =', request.query, request.params.id,
      'options =', options)

    if (request.params.id) {
      response = FootprintService.find('listuser', request.params.id, options)
    }
    else {
      response = FootprintService.find('listuser', criteria, options)
    }
    count = FootprintService.count('listuser', criteria)

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

  create (request, reply) {
    const FootprintService = this.app.services.FootprintService
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query)

    this.log.debug('[ListUserController] (create) model = listuser, payload =', request.payload,
      'options =', options)

    if (request.payload.list) {
      FootprintService.find('list', request.payload.list).then(list => {
        if (list.joinability == 'public') {
          request.payload.pending = false
        }
        if (list.joinability == 'private') {
          var isManager = list.managers.indexOf(request.params.token.id)
          if (!currentUser.is_admin && request.params.token.id != list.owner && isManager === -1) {
            return reply(Boom.forbidden())
          }
        }
        reply(FootprintService.create('listuser', request.payload, options))
      })
    }
    else {
      reply(Boom.badRequest())
    }
  }



}

