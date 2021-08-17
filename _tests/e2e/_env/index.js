//
// Import any possible environment.
//
import local from './local';

//
// Provide config for any environment here. It will be loaded dynamically based
// on the process.env.NODE_ENV when it runs. Defaults to `local`
//
const environments = {
  local,
};

const environmentExists = typeof environments[process.env.NODE_ENV] !== 'undefined';
const env = environmentExists ? environments[process.env.NODE_ENV] : environments.local;

module.exports = env;
