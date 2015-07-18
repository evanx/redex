
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import lodash from 'lodash';

const logger = RedexGlobal.logger(module.filename);

export async function execute(query) {
   logger.info('execute', query);
   return { query };
}
