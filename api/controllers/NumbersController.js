/**
 * @module NumbersController
 * @description Provides aggregate counts for: users.
 */
const Boom = require('@hapi/boom');
const User = require('../models/User');
const config = require('../../config/env');

const { logger } = config;

module.exports = {

  /*
   * @api [get] /numbers
   * tags:
   *   - numbers
   * summary: Returns total number of users in the database.
   * responses:
   *   '200':
   *     description: Object
   *     content:
   *       application/json:
   *         schema:
   *           type: object
   *           properties:
   *             totalUsers:
   *               type: integer
   *               required: true
   *             emailVerified:
   *               type: integer
   *               required: true
   *   '400':
   *     description: Bad request. See response body for details.
   *   '401':
   *     description: Unauthorized. Invalid token.
   *   '403':
   *     description: Unauthorized. You are not an admin.
   */
  async numbers(request) {
    try {
      const [
        totalUsers,
        emailVerified,
      ] = await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ email_verified: true }),
      ]);

      return {
        totalUsers,
        emailVerified,
      };
    } catch (err) {
      logger.error(
        `[NumbersController->numbers] ${err.message}`,
        {
          request,
          fail: true,
        },
      );

      throw Boom.badImplementation(err);
    }
  },
};
