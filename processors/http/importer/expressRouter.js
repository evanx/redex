
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
const RedexConfigs = requireRedex('lib/RedexConfigs');

const { redex } = global;

export default function expressRouter(config, redex) {

   assert(config.port, 'port');
   assert(config.timeout, 'timeout');
   assert(config.paths, 'paths');

   let logger = bunyan.createLogger({name: config.processorName, level: config.loggerLevel});
   let startTime = new Date().getTime();
   let count = 0;
   let paths;
   let app;

   init();

   function init() {
      assert(config.paths, 'config: paths');
      assert(config.paths.length, 'config: paths length');
      paths = lodash(config.paths)
      .filter(item => !item.disabled)
      .map(initPath)
      .value();
      logger.info('start', paths.map(item => item.description));
   }

   function initPath(item) {
      if (item.route) {
         redex.resolveRoute(item.route, config.processorName, item.description);
      } else if (item.response) {
         assert(item.response.statusCode, 'item response statusCode');
      } else {
         assert(false, 'item requires route or response: ' + item.description);
      }
      if (item.match) {
         if (item.match !== 'all') {
            throw {message: 'unsupported match: ' + item.match};
         }
         return item;
      } else if (item.path) {
         logger.debug('item path', item.path, item);
         return item;
      } else {
         assert(false, 'item requires path or match: ' + item.description);
      }
   }

   function matchUrl(message) {
      logger.debug('match', paths.length);
      return lodash.find(paths, item => {
         //logger.debug('match item', item.description);
         if (item.match === 'all') {
            return true;
         } else if (item.path) {
            let value = message.url;
            return item.path.test(value);
         } else {
            logger.warn('match none', item);
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
