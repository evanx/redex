
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import lodash from 'lodash';

export default function urlRegex(config, redex, logger) {

   let rules;

   function initRule(rule) {
      assert(rule.route || rule.response, 'rule requires route or response: ' + rule.label);
      assert(rule.regex || rule.match, 'rule requires regex or match: ' + rule.label);
      if (rule.match) {
         if (rule.match !== 'all') {
            throw {message: 'unsupported match: ' + rule.match};
         }
         return rule;
      } else if (rule.regex) {
         logger.debug('rule regex', rule.regex, rule);
         let regex = new RegExp(rule.regex);
         return Object.assign({}, rule, {regex});
      } else {
         throw {message: 'internal error'};
      }
   }

   function matchUrl(message) {
      logger.debug('match', rules.length);
      return lodash.find(rules, rule => {
         logger.info('match rule', rule.label, rule.hasOwnProperty('regex'), typeof rule.regex);
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
      init() {
         assert(config.rules, 'config: rules');
         assert(config.rules.length, 'config: rules length');
         rules = lodash(config.rules)
         .filter(rule => !rule.disabled)
         .map(initRule)
         .value();
         logger.info('start', rules.map(rule => rule.label));
      },
      end() {
         logger.info('end');
      },
      get state() {
         return { config: config.summary };
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
               assert(false, 'rule route or response: ' + rule.label);
            }
         }
         assert(false, 'no matching route');
      }
   };

   return service;
}
