
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import bunyan from 'bunyan';
import yaml from 'js-yaml';
import lodash from 'lodash';
import express from 'express';

import Paths from '../../lib/Paths';

const { redex } = global;

export default function httpImporter(config, redex) { // trying processor constructor without class

   assert(config.port, 'port');
   assert(config.timeout, 'timeout');
   assert(config.route, 'route');

   var logger, app;
   var seq = new Date().getTime();

   logger = bunyan.createLogger({name: config.processorName, level: config.loggerLevel});

   logger.info('start', config);

   app = express();
   app.listen(config.port);
   logger.info('listen', config.port);
   app.get('/*', async (req, res) => {
      logger.info('req', req.url);
      try {
         seq += 1;
         let meta = {type: 'express', id: seq, host: req.hostname};
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

   const service = { // public methods
      get state() {
         return { config, seq };
      },
   };

   return service;
}
