
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import lodash from 'lodash';

import Files from '../../lib/Files';

const { redix } = global;

export default function regexRouter(config) {

   var seq = new Date().getTime();
   var logger, app;

   logger = bunyan.createLogger({name: config.processorName, level: config.loggerLevel});

   init();

   function init() {
      logger.info('start', config);
      assert(config.rules, 'config: rules');
      assert(config.rules.length, 'config: rules length');
      config.rules.forEach(initRule);
   }

   function initRule(rule) {
      assert(rule.route || rule.response, 'rule requires route or response: ' + rule.description);
      assert(rule.regexp || rule.match, 'rule requires regexp or match: ' + rule.description);
      if (rule.match) {
         if (rule.match !== 'all') {
            throw {message: 'unsupported match: ' + rule.match};
         }
      } else if (rule.regexp) {
         logger.warn('rule regexp', rule.regexp);
         rule.regexp = new RegExp(rule.regexp);
      } else {
         throw {message: 'internal error'};
      }
   }

   function match(message) {
      logger.debug('match', config.rules.length);
      return lodash.find(config.rules, rule => {
         logger.debug('match rule', rule.description, rule.hasOwnProperty('regexp'), rule.regexp);
         if (rule.match === 'all') {
            logger.debug('match all');
            return true;
         } else if (rule.pluck && rule.hasOwnProperty('regexp')) {
            assert(lodash.isObject(message), 'pluck message object');
            if (message.hasOwnProperty(rule.pluck)) {
               let value = message[rule.pluck];
               if (value === null) {
                  logger.debug('regexp pluck null');
                  return false;
               } else {
                  logger.debug('regex', value, rule.regexp.test(value));
                  return rule.regexp.test(value);
               }
            } else {
               logger.debug('no regexp pluck', rule.pluck);
               return rule.regexp.test(value);
            }
         } else {
            logger.debug('match none', rule);
            return false;
         }
      });
   }

   const service = {
      getState() {
         return { config, seq };
      },
      async process(message, meta) {
         logger.info('process', meta);
         let rule = match(message);
         if (rule) {
            if (rule.route) {
               return redix.forward(message, meta, config, rule.route);
            } else if (rule.response) {
               return rule.response;
            } else {
               throw {
                  source: config.processorName,
                  message: 'interal error: no response or route',
                  rule: rule.description
               };
            }
         }
         throw {
            source: config.processorName,
            message: 'no route'
         };
      }
   };

   return service;
}
