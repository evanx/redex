
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import lodash from 'lodash';

const { redex } = global;

export default function urlRegex(config) {

   var seq = new Date().getTime();
   var logger;

   logger = bunyan.createLogger({name: config.processorName, level: 'info' || config.loggerLevel});

   init();

   function init() {
      logger.info('start', config);
      assert(config.rules, 'config: rules');
      assert(config.rules.length, 'config: rules length');
      config.rules.forEach(initRule);
   }

   function initRule(rule) {
      assert(rule.route || rule.response, 'rule requires route or response: ' + rule.description);
      assert(rule.regex || rule.match, 'rule requires regex or match: ' + rule.description);
      if (rule.match) {
         if (rule.match !== 'all') {
            throw {message: 'unsupported match: ' + rule.match};
         }
      } else if (rule.regex) {
         logger.debug('rule regex', rule.regex, rule);
         rule.regex = new RegExp(rule.regex);
      } else {
         throw {message: 'internal error'};
      }
   }

   function matchUrl(message) {
      logger.debug('match', config.rules.length);
      return lodash.find(config.rules, rule => {
         logger.debug('match rule', rule.description, rule.hasOwnProperty('regex'), rule.regex);
         if (rule.match === 'all') {
            return true;
         } else if (rule.regex) {
            let value = message.url;
            return rule.regex.test(value);
         } else {
            logger.warn('match none', rule);
            return false;
         }
      });
   }

   const service = {
      getState() {
         return { config, seq };
      },
      async process(message, meta) {
         logger.debug('process', meta);
         let rule = matchUrl(message);
         if (rule) {
            if (rule.route) {
               return redex.forward(message, meta, config, rule.route);
            } else if (rule.response) {
               return rule.response;
            } else {
               assert(false, 'rule route or response: ' + rule.description);
            }
         }
         assert(false, 'no matching route');
      }
   };

   return service;
}
