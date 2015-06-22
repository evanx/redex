
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import lodash from 'lodash';
import express from 'express';

const Paths = RedexGlobal.require('lib/Paths');

const { redex } = RedexGlobal;

export default function expressImporter(config, redex, logger) {

   assert(config.port, 'port');
   assert(config.timeout, 'timeout');
   assert(config.route, 'route');

   var count = 0;
   var app;

   logger.info('start', config);

   app = express();
   app.listen(config.port);
   logger.info('listen', config.port);
   app.get('/*', async (req, res) => {
      logger.info('req', req.url);
      try {
         count += 1;
         let id = redex.startTime + count;
         let meta = {type: 'express', id: id, host: req.hostname};
         let response = await redex.import(req, meta, config);
         assert(response, 'no response');
         assert(response.statusCode, 'no statusCode');
         res.status(response.statusCode);
         if (response.content) {
            if (!response.contentType) {
               logger.warn('no contentType', response.dataType, typeof response.content);
               response.contentType = Paths.defaultContentType;
            }
            logger.debug('response content:', response.dataType, response.contentType, typeof response.content);
            if (response.dataType === 'json') {
               assert(lodash.isObject(response.content), 'content is object');
               assert(/json$/.test(response.contentType), 'json contentType');
               res.json(response.content);
            } else {
               res.contentType(response.contentType);
               if (response.dataType === 'string') {
                  assert.equal(typeof response.content, 'string', 'string content');
                  res.send(response.content);
               } else if (response.dataType === 'Buffer') {
                  assert.equal(response.content.constructor.name, 'Buffer', 'Buffer content');
                  res.send(response.content);
               } else {
                  assert(false, 'content dataType: ' + response.dataType);
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

   const service = {
      get state() {
         return { config: config.summary, count: count };
      },
   };

   return service;
}
