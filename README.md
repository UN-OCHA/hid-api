# Humanitarian ID v3

[![Build Status](https://travis-ci.org/UN-OCHA/hid_api.svg?branch=master)](https://travis-ci.org/UN-OCHA/hid_api)

Humanitarian ID v3 is built with:

* mongoDB as its database backend
* node.js + hapi as the server

HID v3 acts as an OAuth 2.0 and OpenID Connect server.

The API is documented here: https://api.humanitarian.id/docs/

## Models

* User: the main and most important model of the API: it stores all the information related to a user
* Client: an OAuth client application
* JwtToken: a blacklisted JSON Web Token stored in the database
* OauthToken: an OAuth token
* Service: a Google Group or Mailchimp list which users can subscribe to or unsubscribe from
* Service Credentials: used to store google groups API credentials
* Duplicate: a set of Duplicate users: will be removed after the duplicates are removed from the database

## Controllers

* AuthController: handles the creation of JSON Web Tokens and the OpenID Connect process
* ClientController: CRUD for OAuth clients
* DuplicateController: used for finding duplicate user accounts and removing them
* ServiceController: CRUD for google groups & mailchimp services, as well as subscribe and unsubscribe endpoints
* ServiceCredentialsController: GET endpoint for service credentials
* UserController: CRUD and multiple user related endpoints
* ViewController: shows the login views to allow users to login through the OpenID Connect process

## Routes

Routes map API endpoints to their respective controller methods. Routes are defined in the `config/routes.js` file.

## Policies

Policies provide access control for the controller methods.

* AuthPolicy: defines policies to determine if a user is authenticated and if a user is an administrator or not
* ServicePolicy: determines if a user can create/update/destroy a service or if he can subscribe/unsubscribe to/from a service
* UserPolicy: determines if a user can access controller methods of UserController

## Services

Services are helper methods provided to the controllers.

* EmailService: service to send emails
* HelperService: various helper functions for controllers
* JwtService: issues and verifies JSON Web tokens

## Configuration files

Configuration files are stored in `/config`.

* log.js: configure logging
* main.js: configure trailpacks and paths
* routes.js: configure routes
* session.js: configure sessions when authenticating with OpenId Connect
* web.js: used to configure the web server (hapi)
