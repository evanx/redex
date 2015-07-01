
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import lodash from 'lodash';
import express from 'express';

//const Paths = RedexGlobal.require('util/Paths');
const ExpressResponses = RedexGlobal.require('lib/ExpressResponses');

export default function expressImporter(config, redex, logger) {

   let count = 0;
   let app, server;

   const service = {
      init() {
         assert(config.port, 'port');
         assert(config.timeout, 'timeout');
         assert(config.route, 'route');
      },
      async start() {
         let app = express();
         app.get('/*', async (req, res) => {
            logger.info('req', req.url);
            try {
               count += 1;
               let id = redex.startTime + count;
               let meta = {type: 'express', id: id, host: req.hostname};
               let response = await redex.import(req, meta, config);
               ExpressResponses.sendResponse(req, res, response);
            } catch (error) {
               ExpressResponses.sendError(req, res, error);
            }
         });
         await Promises.create(cb => {
            server = app.listen(config.port, cb);
         });
         logger.info('listening', config.port);
      },
      end() {
         if (server) {
            server.close();
            logger.info('end');
         } else {
            logger.warn('end');
         }
      },
      get state() {
         return { config: config.summary, count: count };
      },
   };

   return service;
}
