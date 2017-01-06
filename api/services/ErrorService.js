'use strict';

const Service = require('trails/service');
const Boom = require('boom');
const Nodemailer = require('nodemailer');
const TransporterUrl = 'smtp://' + process.env.SMTP_USER + ':' + process.env.SMTP_PASS + '@' + process.env.SMTP_HOST + ':' + process.env.SMTP_PORT;
const Transporter = Nodemailer.createTransport(TransporterUrl);

/**
 * @module ErrorService
 * @description Errors Service
 */
module.exports = class ErrorService extends Service {
  handle(err, reply) {
    this.log.error(err);
    if (err.isBoom) {
      return reply(err);
    }
    else {
      reply(Boom.badImplementation(err.toString()));
      var mailOptions={
         to : 'guillaume@viguierjust.com',
         subject : 'HID Fatal Error',
         text : err.toString()
      };
      Transporter.sendMail(mailOptions);
    }
  }
};
