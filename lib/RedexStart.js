
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import bunyan from 'bunyan';
import lodash from 'lodash';
import util from 'util';

import Files from '../util/Files';
import Paths from '../util/Paths';
import Redis from '../util/Redis';

import Redex from './Redex';
import RedexProcessorConfigs from './RedexProcessorConfigs';
import RedexFiles from './RedexFiles';
import RedexProcessors from './RedexProcessors';
import InstanceNames from './InstanceNames';
import RedexConfigDecorations from './RedexConfigDecorations';

let logger = RedexGlobal.logger(module.filename, 'debug');

let that = {};

start().then(started => {
   if (!started) {
      logger.warn('lifecycle', that.redex.lifecycle);
   } else {
      logger.info('started');
   }
}).catch(err => {
   Errors.log(logger, err);
});

async function start() {
   that.envConfig = createEnvConfig(process.env);
   that.redexConfig = await getConfigObject(that.envConfig);
   assert(that.redexConfig, 'redexConfig');
   that.loggerLevel = that.redexConfig.loggerLevel || RedexGlobal.loggerLevel;
   logger = bunyan.createLogger({name: 'RedexStart', level: that.loggerLevel});
   if (that.redexConfig.metaConfig) {
      logger.info('redexConfig', that.redexConfig);
   }
   that.redexConfig.env = that.envConfig;
   let decoration = await YamlFiles.readFile(RedexFiles.formatClassYaml('lib', 'Redex'));
   that.redexConfig = RedexConfigDecorations.decorate(decoration, that.redexConfig);
   RedexConfigDecorations.assert(decoration, that.redexConfig, 'Redex config');
   that.redex = new Redex(that.redexConfig);
   that.redex.startTime = new Date().getTime();
   Object.assign(RedexGlobal, that);
   return that.redex.start();
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
   args.forEach(arg => {
      if (arg === 'debug') {
         assert(envConfig.loggerLevel, 'duplicate loggerLevel');
         envConfig.loggerLevel = 'debug';
      } else if (arg === 'info') {
         assert(envConfig.loggerLevel, 'duplicate loggerLevel');
         envConfig.loggerLevel = 'info';
      } else if (arg === 'cancel') {
         envConfig.cancelled = true;
      } else {
         let configurator = RedexFiles.configuratorMap[arg];
         if (configurator) {
            assert(!envConfig.configurator, 'duplicate configurator');
            envConfig.configurator = configurator;
            logger.debug('configurator', configurator);
         } else if (lodash.endsWith(arg, '.yaml')) {
            assert(fs.statSync(arg).isFile(), 'not a file: ' + arg);
            envConfig.configFile = arg;
         } else {
            throw new Error('argument: ' + arg);
         }
      }
   });
}

async function getConfigObject(env) {
   logger.debug('getConfigObject', env);
   if (env.redis) {
      return getConfigFromRedis(env.redis);
   }
   if (env.configurator) {
      return invokeConfigurator(env.configurator);
   }
   let fileName = path.basename(env.configFile, '.yaml');
   if (fileName.indexOf(RedexFiles.configuratorPrefix) === 0) {
      if (!env.configurator) {
         let configuratorClass = InstanceNames.parseClass(
            fileName.substring(RedexFiles.configuratorPrefix.length));
         logger.debug('configuratorClass', configuratorClass);
         assert(configuratorClass, 'configuratorClass');
         let classFile = RedexFiles.formatClassFile('configurator', configuratorClass);
         logger.debug('check:', classFile);
         if (await Files.existsFile(classFile)) {
            env.configurator = configuratorClass;
            return invokeConfigurator(configuratorClass);
            if (env.configurator) {
               logger.debug('auto configurator class:', env.configurator, env.configFile);
            } else {
               logger.debug('redex config file:', env.configFile);
            }
         }
      } else {
         logger.debug('configurator', env.configurator, env.configFile);
      }
   }
   if (!env.baseDir) {
      env.baseDir = path.dirname(env.configFile);
      logger.debug('assign baseDir', env.baseDir, env.configFile);
   }
   if (env.configurator) {
      return getConfigObjectFromConfigurator(env);
   } else {
      return getConfigObjectFromFile(env);
   }
}

async function getConfigObjectFromFile(env) {
   logger.debug('getConfigFromFile', env);
   if (env.configFile) {
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
   let redexConfig = YamlFiles.readFileSync(env.configFile);
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
   let classFile = RedexFiles.formatClassFile('configurator', configuratorClass);
   let metaConfigPath = RedexFiles.formatDefaultConfiguratorConfig(configuratorClass);
   logger.debug('metaConfigPath', configuratorClass, metaConfigPath);
   let metaConfigFile = path.basename(metaConfigPath);
   let metaConfig = YamlFiles.readFileSync(metaConfigPath);
   if (metaConfig.label) {
      metaConfig.label = lodash.trim(metaConfig.label);
   }
   let configs = await getConfigsFromConfigurator(configuratorClass, metaConfig);
   return Object.assign({metaConfig}, {
      configurator: configuratorClass,
      metaConfigPath: metaConfigPath,
      configs: configs
   });
}

async function getConfigObjectFromConfigurator(env) {
   let config = await YamlFiles.readFileSync(env.configFile);
   config.configs = await getConfigsFromConfigurator(env.configFile, config);
   return config;
}

async function getConfigsFromConfigurator(configuratorClass, config) {
   logger.debug('getConfigsFromConfigurator', configuratorClass, configuratorClass);
   let configurator = require(RedexFiles.formatClassFile('configurator', configuratorClass));
   if (/^[A-Z]/.test(configuratorClass)) {
      assert(lodash.isClass(configurator), 'Valid configurator class: ' + configuratorClass);
      return new configurator(config, that.redexConfig);
   } else {
      assert(lodash.isFunction(configurator), 'Valid configurator function: ' + configuratorClass);
      return configurator(config, that.redexConfig);
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
   logger.debug('getConfigsFromConfigDir', envConfig.configDir);
   assert(envConfig.configDir, 'configDir');
   assert(fs.existsSync(envConfig.configDir), 'exists configDir: ' + envConfig.configDir);
   return fs.readdirSync(envConfig.configDir).filter(file => {
      if (file === 'redex.yaml') {
      } else if (lodash.endsWith(file, '.json')) {
      } else if (lodash.endsWith(file, '.yaml')) {
         return true;
      }
   }).map(file => {
      let config = YamlFiles.readFileSyncDir(envConfig.configDir, file);
      config.processorName = path.basename(file, '.yaml');
      return config;
   });
}
