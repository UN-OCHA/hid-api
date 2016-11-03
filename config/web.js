/**
 * Server Configuration
 * (app.config.web)
 *
 * Configure the Web Server
 *
 * @see {@link http://trailsjs.io/doc/config/web}
 */
module.exports = {

  /**
   * The port to bind the web server to
   */
  port: process.env.PORT || 3000,

  /**
   * The host to bind the web server to
   */
  host: process.env.HOST || '0.0.0.0',

  views: {
    engines: {
      html: require('ejs')
    },
    path: 'templates'
  },
  
  /*plugins: [
    {
      register: require('yar'),
      options: { }
    },
    {
      register: require('hapi-oauth2orize'),
      options: { }
    }
  ],/*/

  options: {
    routes: {
      cors: {
        additionalExposedHeaders: [ 'X-Total-Count' ]
      }
    }
  }
}
