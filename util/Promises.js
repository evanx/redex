
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import lodash from 'lodash';

import Loggers from './Loggers';

const logger = Loggers.create(module.filename);

function formatTimeoutErrorMessage(name, timeoutMillis) {
   return name + ' (' + timeout + 'ms)';
}

function generateCallback(resolve, reject) {
   return (err, reply) => {
      if (err) {
         reject(err);
      } else {
         resolve(reply);
      }
   };
}

module.exports = {
   make(fn) {
      return new Promise((resolve, reject) => fn(generateCallback(resolve, reject)));
   },
   delay(millis) {
      return new Promise((resolve, reject) => {
         setTimeout(() => resolve(), millis);
      });
   },
   timeout(name, timeoutMillis, promise) {
      if (timeoutMillis) {
         return new Promise((resolve, reject) => {
            promise.then(resolve, reject);
            setTimeout(() => {
               let message = formatTimeoutErrorMessage(name, timeoutMillis);
               reject({name, message});
            }, timeoutMillis);
         });
      } else {
         return promise;
      }
   }
};
