# Humanitarian ID v3

[![Build Status](https://travis-ci.org/UN-OCHA/hid_api.svg?branch=master)](https://travis-ci.org/UN-OCHA/hid_api)

Humanitarian ID v3 API is built with:

* mongoDB as its database backend
* hapi as its web server

The HID v3 API acts as an OAuth 2.0 and OpenID Connect server.

The API is documented here: https://api.humanitarian.id/docs/

## Models

* User: the main and most important model of v2 API: it stores all the information related to a user
* List: a list can be of different types (operation, group, disaster, custom, organization, functional role, office). Users check in
and out of lists
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
* ListController: CRUD for lists
* ListUserController: functions for checking in & out of a list
* ServiceController: CRUD for google groups & mailchimp services, as well as subscribe and unsubscribe endpoints
* ServiceCredentialsController: GET endpoint for service credentials
* UserController: CRUD and multiple user related endpoints
* ViewController: shows the login views to allow users to login through the OpenID Connect process

## Routes

Routes map API endpoints to their respective controller methods. Routes are defined in the `config/routes.js` file.

## Policies

Policies "protect" controller methods from being accessed by unauthorized users. Policies are defined in the `config/policies.js` file.

* AuthPolicy: defines policies to determine if a user is authenticated and if a user is an administrator or not
* ListPolicy: determines if a user is allowed to create/update/delete a list
* ListUserPolicy: determines is a user is allowed to check in/out of a list
* ServicePolicy: determines if a user can create/update/destroy a service or if he can subscribe/unsubscribe to/from a service
* UserPolicy: determines if a user can access controller methods of UserController

## Services

Services are helper methods provided to the controllers.

* EmailService: service to send emails
* HelperService: various helper functions for controllers
* JwtService: issues and verifies JSON Web tokens
* ListService: helper methods for lists controller

## Configuration files

Configuration files are stored in `/config`.

* caches.js: configuration file used for trailpack-cache
* cron.js: configuration file used for trailpack-cron: contains various functions launched at regular intervals
* database.js: used to configure the connections to databases
* footprints.js: used to configure footprint options
* i18n.js: configure internationalization (not used currently)
* log.js: configure logging
* main.js: configure trailpacks and paths
* policies.js: configure policies
* routes.js: configure routes
* session.js: used to configure sessions when authenticating with openId Connect
* views.js: used to configure the views
* web.js: used to configure the web server (hapi)
