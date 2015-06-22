
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

console.log('RedexGlobal', RedexGlobal.sourceDir, RedexGlobal.loggerLevel);

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import bunyan from 'bunyan';
import yaml from 'js-yaml';
import lodash from 'lodash';
import util from 'util';

import Files from './Files';
import Paths from './Paths';
import Redis from './Redis';
import Redex from './Redex';
import RedexConfigs from './RedexConfigs';

let that = {};
let logger = bunyan.createLogger({name: 'RedexStart', level: RedexGlobal.loggerLevel});

const configurators = {
   http: 'httpFileServer'
};

start();

async function start() {
   try {
      that.envConfig = createEnvConfig(process.env);
      that.redexConfig = await getConfigObject(that.envConfig);
      assert(that.redexConfig, 'redexConfig');
      that.loggerLevel = that.redexConfig.loggerLevel || RedexGlobal.loggerLevel;
      logger = bunyan.createLogger({name: 'redex/start', level: that.loggerLevel});
      if (that.redexConfig.metaConfig) {
         logger.info('metaConfig', that.redexConfig.metaConfig);
      }
      that.redex = new Redex(that.redexConfig);
      that.redex.startTime = new Date().getTime();
      Object.assign(RedexGlobal, that);
      RedexConfigs.createProcessors(that.redex, that.redexConfig.configs);
      delete that.redexConfig.configs;
      that.redex.init();
   } catch (e) {
      if (e.name === 'AssertionError1') {
         logger.error('Assertion: ' + e.message);
      } else {
         logger.error('start', e);
         if (e.stack) {
            logger.error(e);
         }
      }
   }
}

function createEnvConfig(env) {
   let { baseDir, configDir, configFile, loggerLevel, configKey, configHashKey } = env;
   let envConfig = { baseDir, configDir, configFile, loggerLevel };
   if (env.redisPort || env.redisHost) {
      assert(!(configHashKey && configKey), 'either configHashKey or configKey');
      envConfig.redisConfig = Object.assign({configKey, configHashKey}, {
         port: env.redisPort || 6379,
         host: env.redisHost || 'localhost',
      });
   }
   envConfig.loggerLevel = envConfig.loggerLevel || 'debug';
   if (process.argv.length > 2) {
      processArgs(envConfig, process.argv.slice(2));
   }
   return envConfig;
}

function processArgs(envConfig, args) {
   logger.debug('args', args);
   let configurator;
   args.forEach(arg => {
      if (arg === 'debug') {
         assert(envConfig.loggerLevel, 'duplicate loggerLevel');
         envConfig.loggerLevel = 'debug';
      } else if (arg === 'info') {
         assert(envConfig.loggerLevel, 'duplicate loggerLevel');
         envConfig.loggerLevel = 'info';
      } else {
         let configurator = configurators[arg];
         if (configurator) {
            assert(!envConfig.configurator, 'duplicate configurator');
            envConfig.configurator = configurator;
         } else if (lodash.endsWith(arg, '.yaml')) {
            assert(fs.statSync(arg).isFile(), 'not a file: ' + arg);
            envConfig.configFile = arg;
         } else {
            throw new AssertionError('argument: ' + arg);
         }
      }
   });
}

async function getConfigObject(env) {
   if (env.redis) {
      return getConfigFromRedis(env.redis);
   }
   if (env.configurator) {
      return invokeConfigurator(env.configurator);
   }
   if (!env.configurator) {
      let fileName = path.basename(env.configFile);
      if (fileName !== 'redex.yaml' && !env.configurator) {
         env.configurator = getConfiguratorClass(fileName);
      } else {
         env.baseDir = path.dirname(env.configFile);
         logger.debug('baseDir', env.baseDir, env.configFile);
      }
   }
   if (env.configurator) {
      logger.debug('configurator', env.configurator, env.configFile);
      let config = await readFileSyncYamlFile(env.configFile);
      config.configs = await getConfigsFromConfigurator(env.configFile, config);
      return config;
   }
   return getConfigFile(env);
}

async function getConfigFile(env) {
   logger.debug('getConfigFile', env);
   if (env.configFile) {
      if (path.basename(env.configFile) === 'redex.yaml') {
         assert(!env.baseDir, '!env.baseDir');
         env.baseDir = path.dirname(env.configFile);
      }
   } else if (env.configDir) {
      logger.debug('configDir', env.configDir);
      env.baseDir = path.dirname(env.configDir);
      env.configFile = Paths.join(env.baseDir, 'redex.yaml');
   } else if (env.baseDir) {
      logger.debug('baseDir', env.baseDir);
      env.baseDir = env.baseDir.replace(/\/$/, '');
      assert(fs.statSync(env.baseDir).isDirectory(), 'baseDir: ' + env.baseDir);
      env.configFile = Paths.join(env.baseDir, 'redex.yaml');
      env.configDir = env.baseDir + '/config';
   } else {
      assert(false, 'configFile, configDir, or baseDir');
   }
   return readConfigFile(env);
}

async function readConfigFile(env) {
   logger.debug('readConfigFile', env.configFile);
   assert(env.configFile, 'env.configFile');
   assert(fs.statSync(env.configFile).isFile(), 'configFile: ' + env.configFile);
   let redexConfig = readFileSyncYamlFile(env.configFile);
   if (!redexConfig.configs) {
      redexConfig.configs = await getConfigsFromConfigDir(env);
   }
   if (!lodash.isArray(redexConfig.configs) && lodash.isObject(redexConfig.configs)) {
      redexConfig.configs = Object.keys(redexConfig.configs).map(processorName => {
         let processorConfig = redexConfig.configs[processorName];
         processorConfig.processorName = processorName;
         return processorConfig;
      });
   }
   assert(lodash.isArray(redexConfig.configs), 'isArray configs');
   return redexConfig;
}

async function invokeConfigurator(configuratorClass) {
   let metaConfigFile = util.format('configurator.%s.default.yaml', configuratorClass);
   let metaConfigPath = util.format('%s/config/%s', RedexGlobal.sourceDir, metaConfigFile);
   logger.debug('metaConfigPath', metaConfigPath);
   let metaConfig = RedexConfigs.decorateMetaConfig(readFileSyncYamlFile(metaConfigPath));
   let configs = await getConfigsFromConfigurator(metaConfigFile, metaConfig);
   return Object.assign({metaConfig}, {
      configurator: configuratorClass,
      configs: configs
   });
}

async function getConfigsFromConfigurator(configuratorName, config) {
   let configuratorClass = getConfiguratorClass(configuratorName);
   logger.debug('getConfigsFromConfigurator', configuratorName, configuratorClass);
   let configurator = require('../' + configuratorClass);
   if (/^[A-Z]/.test(configuratorName)) {
      assert(lodash.isClass(configurator), 'Valid configurator class: ' + configuratorName);
      return new configurator(config, that.redexConfig);
   } else {
      assert(lodash.isFunction(configurator), 'Valid configurator function: ' + configuratorName);
      return configurator(config, that.redexConfig);
   }
}

function getConfiguratorClass(fileName) {
   fileName = path.basename(fileName);
   //logger.debug('getConfiguratorClass', fileName);
   let match = fileName.match(/^(.+)\.([^\.]+)\.yaml$/);
   if (match && match.length >= 3) { // class, instance name
      return match[1].replace(/\./g, '/');
   }
}

async function getConfigFromRedisKey(redisEnv) {
   logger.info(' getConfigFromRedisKey', redisEnv);
   const redis = new Redis();
   try {
      let reply = await redis.get(redisEnv.key);
      let config = JSON.parse(reply);
      return config;
   } finally {
      redis.end();
   }
}

async function getConfigFromHashKey(redisEnv) {
   logger.info(' getConfigFromHashKey', redisEnv);
   const redis = new Redis();
   try {
      let reply = await redis.hgetall(redisEnv.hashKey);
      let config = JSON.parse(reply);
      return config;
   } finally {
      redis.end();
   }
}

function getConfigsFromConfigDir(envConfig) {
   logger.debug('getConfigsFromConfigDir', envConfig);
   if (!envConfig.configDir) {
      envConfig.configDir = envConfig.baseDir + '/config';
   }
   assert(fs.existsSync(envConfig.configDir), 'exists configDir');
   return fs.readdirSync(envConfig.configDir).filter(file => {
      if (file === 'redex.yaml') {
      } else if (lodash.endsWith(file, '.json')) {
      } else if (lodash.endsWith(file, '.yaml')) {
         return true;
      }
   }).map(file => {
      let config = readFileSyncYamlDirFile(envConfig.configDir, file);
      config.processorName = path.basename(file, '.yaml');
      return config;
   });
}

function readFileSyncYamlDirFile(dir, yamlFile) {
   return readFileSyncYamlFile(Paths.join(dir, yamlFile));
}

function readFileSyncYamlFile(yamlFile) {
   try {
      return yaml.safeLoad(fs.readFileSync(yamlFile, 'utf8'));
   } catch (e) {
      if (e.name === 'YAMLException') {
         let err = Object.assign({yamlFile}, {name: e.name, reason: e.reason});
         if (e.mark) {
            Object.keys(e.mark).filter(
               name => name !== 'buffer'
            ).forEach(name => {
               err[name] = e.mark[name];
            });
         }
         throw err;
      } else {
         throw e;
      }
   }
}
