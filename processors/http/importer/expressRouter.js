
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import bunyan from 'bunyan';
import yaml from 'js-yaml';
import lodash from 'lodash';
import express from 'express';

const Paths = requireRedex('lib/Paths');

const { redex } = global;

export default function expressRouter(config, redex) {

   assert(config.port, 'port');
   assert(config.timeout, 'timeout');
   assert(config.paths, 'paths');

   var logger = bunyan.createLogger({name: config.processorName, level: config.loggerLevel});
   var startTime = new Date().getTime();
   var count = 0;
   var app;

   init();

   function init() {
      assert(config.paths, 'config: paths');
      assert(config.paths.length, 'config: paths length');
      paths = lodash(config.paths)
      .filter(rule => !rule.disabled)
      .map(initPath)
      .value();
      logger.info('start', paths.map(rule => rule.description));
   }

   function initPath(rule) {
      if (rule.route) {
         redex.resolveAll(rule.route, config.processorName, rule.description);
      } else if (rule.response) {

      } else {
         assert(false, 'rule requires route or response: ' + rule.description);
      }
      if (rule.match) {
         if (rule.match !== 'all') {
            throw {message: 'unsupported match: ' + rule.match};
         }
         return rule;
      } else if (rule.path) {
         logger.debug('rule path', rule.path, rule);
         return rule;
      } else {
         assert(false, 'rule requires path or match: ' + rule.description);
      }
   }

   function matchUrl(message) {
      logger.debug('match', paths.length);
      return lodash.find(paths, rule => {
         //logger.debug('match rule', rule.description);
         if (rule.match === 'all') {
            return true;
         } else if (rule.path) {
            let value = message.url;
            return rule.path.test(value);
         } else {
            logger.warn('match none', rule);
            return false;
         }
      });
   }

   app = express();
   app.listen(config.port);
   logger.info('listen', config.port);
   app.get('/*', async (req, res) => {
      logger.info('req', req.url);
      try {
         count += 1;
         let id = startTime + count;
         let meta = {type: 'express', id: id, host: req.hostname};
         let response = await redex.import(req, meta, config);
         assert(response, 'no response');
         assert(response.statusCode, 'no statusCode');
         res.status(response.statusCode);
         if (response.content) {
            if (!response.contentType) {
               response.contentType = Paths.defaultContentType;
            }
            logger.debug('contentType', response.contentType);
            if (lodash.isObject(response.content) || /json$/.test(response.contentType)) {
               res.json(response.content);
            } else {
               res.contentType(response.contentType);
               if (lodash.isString(response.content)) {
                  logger.debug('string content:', response.statusCode, typeof response.content);
                  res.send(response.content);
               } else {
                  res.send(response.content);
               }
            }
         } else if (response.statusCode === 200) {
            logger.debug('no content');
            res.send();
         } else {
            logger.debug('statusCode', response.statusCode);
            res.send();
         }
      } catch (err) {
         if (err.name === 'AssertionError') {
            logger.warn(err.name + ': ' + err.message);
            res.status(500).send({name: err.name, message: err.message});
         } else {
            logger.warn(err);
            res.status(500).send(err);
         }
      }
   });

   const methods = {
      get state() {
         return { config, id };
      },
   };

   return methods;
}
