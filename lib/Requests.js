
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import fs from 'fs';
import request from 'request';
import lodash from 'lodash';

const logger = RedexGlobal.logger(module.filename, 'info');

module.exports = {
   request(options) {
      logger.debug('request', options);
      return new Promise((resolve, reject) => {
         request(options, (err, response, content) => {
            logger.debug('response', options.url, err || response.statusCode);
            if (err) {
               reject(err);
            } else if (response.statusCode !== 200) {
               reject({statusCode: response.statusCode});
            } else {
               resolve(content);
            }
         });
      });
   }
};
