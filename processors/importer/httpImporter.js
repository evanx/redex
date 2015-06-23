
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import lodash from 'lodash';
import express from 'express';

const ExpressResponses = RedexGlobal.require('lib/ExpressResponses');

export default function httpImporter(config, redex, logger) {

   assert(config.port, 'port');
   assert(config.timeout, 'timeout');
   assert(config.route, 'route');

   logger.info('start', config);

   let count = 0;
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

   app.listen(config.port);
   logger.info('listen', config.port);

   const service = {
      get state() {
         return { config: config.summary, count: count };
      },
   };

   return service;
}
