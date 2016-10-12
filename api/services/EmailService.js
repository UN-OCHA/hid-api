'use strict'

const Service = require('trails-service')
const Nodemailer = require('nodemailer')
const EmailTemplate = require('email-templates').EmailTemplate;
const TemplateDir = require('path').join(__dirname, '../../templates/')
const Transporter = Nodemailer.createTransport('smtp://' + process.env.SMTP_USER + ':' + process.env.SMTP_PASS + '@' + process.env.SMTP_HOST + ':' + process.env.SMTP_PORT)

/**
 * @module EmailService
 * @description Service to send emails
 */
module.exports = class EmailService extends Service {

  // Send an email
  send (options, template, context, callback) {
    var templateDir = TemplateDir + template
    if (options.locale && options.locale != 'en') templateDir += '/' + options.locale
    var templateSender = Transporter.templateSender(new EmailTemplate(templateDir), {
      from: 'info@humanitarian.id'
    });
    templateSender(options, context, callback);
  }
}

