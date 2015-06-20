
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import lodash from 'lodash';

const { redex } = global;

export default function regexRouter(config) {

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
         assert(rule.pluck || config.pluck, 'no pluck for: ' + rule.description);
         if (!rule.pluck) {
            rule.pluck = config.pluck;
         }
         logger.warn('rule regex', rule.regex, rule.pluck);
         rule.regex = new RegExp(rule.regex);
      } else {
         throw {message: 'internal error'};
      }
   }

   function match(message) {
      logger.debug('match', config.rules.length);
      return lodash.find(config.rules, rule => {
         logger.debug('match rule', rule.description, rule.hasOwnProperty('regex'), rule.regex);
         if (rule.match === 'all') {
            logger.debug('match all');
            return true;
         } else if (rule.pluck && rule.hasOwnProperty('regex')) {
            assert(lodash.isObject(message), 'pluck message object');
            if (message.hasOwnProperty(rule.pluck)) {
               let value = message[rule.pluck];
               if (value === null) {
                  logger.debug('regex pluck null');
                  return false;
               } else {
                  logger.debug('regex', value, rule.regex.test(value));
                  return rule.regex.test(value);
               }
            } else {
               logger.debug('no regex pluck', rule.pluck);
               return rule.regex.test(value);
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
         logger.debug('process', meta);
         let rule = match(message);
         if (rule) {
            if (rule.route) {
               return redex.forward(message, meta, config, rule.route);
            } else if (rule.response) {
               return rule.response;
            } else {
               throw {
                  message: 'interal error: no response or route for rule: ' + rule.description,
                  source: config.processorName,
                  rule: rule.description
               };
            }
         }
         if (config.pluck && message[config.pluck]) {
            let plucked = message[config.pluck];
            throw {
               message: 'no route for: ' + plucked,
               source: config.processorName
            };
         } else {
            throw {
               message: 'no route',
               source: config.processorName
            };
         }
      }
   };

   return service;
}
