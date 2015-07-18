
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import lodash from 'lodash';

const logger = RedexGlobal.logger(module.filename);

const that = {
   sendResponseStatus(req, res, response) {
      assert(response.statusCode, 'response statusCode');
      assert(response.content, 'response content');
      res.status(response.statusCode).send(response.content);
   },
   sendResponse(req, res, response) {
      assert(response, 'no response');
      assert(response.statusCode, 'no statusCode');
      res.status(response.statusCode);
      if (response.content) {
         assert(response.contentType, 'contentType');
         logger.info('response content:', response.contentType, typeof response.content);
         if (typeof response.content === 'string') {
            res.contentType(response.contentType);
            res.send(response.content);
         } else if (response.content.constructor.name === 'Buffer') {
            res.contentType(response.contentType);
            res.send(response.content);
         } else {
            assert(response.contentType, 'application/json', 'contentType: ' + response.contentType);
            let content = JSON.stringify(response.content, null, 2) + '\n';
            res.contentType(response.contentType);
            res.send(content);
         }
      } else if (response.statusCode === 200) {
         logger.warn('no content');
         res.send();
      } else {
         logger.debug('statusCode', response.statusCode);
         res.send();
      }
   },
   sendError(req, res, error) {
      if (error.name === 'AssertionError') {
         error = {name: error.name, message: error.message};
         logger.warn('error', error);
      } else if (error.stack) {
         logger.warn('error', error.stack);
      } else {
         logger.warn('error', error);
      }
      res.status(500).send(error);
   }
};

module.exports = that;
