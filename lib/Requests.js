

import fs from 'fs';
import request from 'request';
import bunyan from 'bunyan';
//import lodash from 'lodash';

const logger = bunyan.createLogger({name: 'Requests', level: 'debug'});

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
