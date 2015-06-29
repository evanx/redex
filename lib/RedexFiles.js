
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import lodash from 'lodash';
import util from 'util';

let logger = RedexGlobal.logger(module.filename);

const that = {};

const RedexFiles = {
   get configuratorMap() {
      return {http: 'httpFileServer'};
   },
   get configuratorPrefix() {
      return 'configurator.';
   },
   start(spec) {
   },
   formatClassFile(classType, className) {
      return util.format('%s/%s/%s.js', RedexGlobal.sourceDir, classType, className);
   },
   formatClassYaml(classType, className) {
      return util.format('%s/%s/%s.yaml', RedexGlobal.sourceDir, classType, className);
   },
   formatDefaultConfiguratorConfig(configuratorClass) {
      assert.equal(configuratorClass.indexOf('.'), -1, 'default configurator class');
      return util.format('%s/config/configurator.%s.default.yaml', RedexGlobal.sourceDir, configuratorClass);

   }
}

module.exports = RedexFiles;
