
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

let logger = RedexGlobal.logger(module.filename);

class InstanceNames {
   parseClass(instanceName) {
      logger.info('parseClass', instanceName);
      let match = instanceName.match(/^(.+)\.([^\.]+)$/);
      if (match && match.length >= 3) { // class, instance name
         return match[1].replace(/\./g, '/');
      }
   }
}

module.exports = new InstanceNames();
