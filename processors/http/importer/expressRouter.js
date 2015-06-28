
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import lodash from 'lodash';
import express from 'express';

const ExpressResponses = RedexGlobal.require('lib/ExpressResponses');

export default function expressRouter(config, redex, logger) {

   let count = 0;
   let gets;
   let app, server;

   function initPath(item) {
      if (item.route) {
         redex.resolveRoute(item.route, config.processorName, item.label);
      } else if (item.response) {
         assert(item.response.statusCode, 'item response statusCode');
      } else {
         assert(false, 'item requires route or response: ' + item.label);
      }
      if (item.path) {
         logger.debug('item path', item.path, item);
         return item;
      } else {
         assert(false, 'item requires path: ' + item.label);
      }
   }

   function add(item) {
      logger.info('path', item.path);
      assert(item.path, 'path: ' + item.label);
      assert.equal(item.path[0], '/', 'absolute path: ' + item.path);
      app.get(item.path, async (req, res) => {
         logger.info('req', req.url);
         try {
            count += 1;
            let id = redex.startTime + count;
            let meta = {type: 'express', id: id, host: req.hostname};
            if (item.route) {
               logger.debug('route:', item.route, item.label);
               let response = await redex.import(req, meta, {
                  processorName: config.processorName,
                  timeout: item.timeout || config.timeout,
                  route: item.route,
               });
               ExpressResponses.sendResponse(req, res, response);
            } else if (item.response) {
               logger.debug('response', item.response, item.label);
               ExpressResponses.sendResponseStatus(req, res, item.response);
            } else {
               assert(false, 'route or response: ' + item.label);
            }
         } catch (error) {
            ExpressResponses.sendError(req, res, error);
         }
      });
   }

   const methods = {
      get state() {
         return { config: config.summary, count: count };
      },
      init() {
         assert(config.port, 'port');
         assert(config.timeout, 'timeout');
         assert(config.gets, 'config: gets');
         assert(config.gets.length, 'config: gets length');
         gets = lodash(config.gets)
            .filter(item => !item.disabled)
            .map(initPath)
            .value();
      },
      async start() {
         app = express();
         gets.forEach(add);
         server = app.listen(config.port);
         logger.info('listen', config.port);
      },
      end() {
         if (server) {
            logger.info('end', Object.keys(server));
            server.close();
            logger.info('end');
         } else {
            logger.warn('end');
         }
      },
   };

   return methods;
}
