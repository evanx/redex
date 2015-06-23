
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
