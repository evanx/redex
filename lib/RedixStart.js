
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import bunyan from 'bunyan';
import yaml from 'js-yaml';
import lodash from 'lodash';
//import Map from 'es6-map';

import Files from './Files';
import Paths from './Paths';
import Redis from './Redis';
import Redix from './Redix';

import RedixConfigs from './RedixConfigs';

var state = {}, logger;

start();

async function start() {
   try {
      state.envConfig = extractEnvConfig(process.env);
      state.redixConfig = await getConfigObject(state.envConfig);
      //state.redixConfig.baseDir = state.envConfig.baseDir;
      //state.redixConfig.env = state.envConfig;
      global.redixLoggerLevel = state.redixConfig.loggerLevel || 'debug';
      logger = bunyan.createLogger({name: 'redix/start', level: global.redixLoggerLevel});
      global.redix = state.redix = new Redix(state.redixConfig);
      RedixConfigs.createProcessors(redix, state.redixConfig.configs);
   } catch (e) {
      if (e.name === 'AssertionError1') {
         console.error('Assertion: ' + e.message);
      } else {
         console.error(e.stack);
      }
   }
}

function extractEnvConfig(env) {
   let { baseDir, configDir, configFile, loggerLevel, configKey, configHashKey } = env;
   let envConfig = { baseDir, configDir, configFile, loggerLevel };
   if (env.redisPort || env.redisHost) {
      assert(!(configHashKey && configKey), 'either configHashKey or configKey');
      envConfig.redisConfig = Object.assign({configKey, configHashKey}, {
         port: env.redisPort || 6379,
         host: env.redisHost || 'localhost',
      });
   }
   envConfig.loggerLevel = env.loggerLevel || 'debug';
   return envConfig;
}

function getConfiguratorName(fileName) {
   console.info('getConfiguratorClass', fileName);
   let match = fileName.match(/^(.+)\.([^\.]+)\.yaml$/);
   if (match && match.length >= 3) { // class, instance name
      return match[1].replace(/\./g, '/');
   }
}

async function getConfigObject(env) {
   if (env.redis) {
      return getConfigFromRedis(env.redis);
   }
   if (env.configFile) {
      if (!env.configurator) {
         let fileName = path.basename(env.configFile);
         if (fileName !== 'redix.yaml' && !env.configurator) {
            env.configurator = getConfiguratorName(fileName);
            console.info('configurator', env.configurator);
         } else {
            env.baseDir = path.dirname(env.configFile);
            console.info('baseDir', env.baseDir, env.configFile);
         }
      }
      if (env.configurator) {
         //env.baseDir = process.cwd();
         assert(env.configurator, 'configurator');
         let config = await readFileSyncYamlFile(env.configFile);
         config.configs = await getConfigsFromConfigurator(env.configurator, config);
         return config;
      }
   } else if (env.baseDir) {
      env.baseDir = env.baseDir.replace(/\/$/, '');
      env.configFile = Paths.joinPath(env.baseDir, 'redix.yaml');
      if (!env.configDir) {
         env.configDir = env.baseDir + '/config';
      }
   } else if (env.configDir) {
      env.baseDir = path.dirname(env.configDir);
      env.configFile = Paths.joinPath(env.baseDir, 'redix.yaml');
   } else {
      throw new Error('Require environment: configFile, configDir, or baseDir');
   }
   assert(env.configFile, 'env.configFile');
   let redixConfig = readYamlFileSync(env.configFile);
   if (!redixConfig.configs) {
      redixConfig.configs = await getConfigsFromConfigDir(env);
   }
   if (lodash.isObject(redixConfig.configs)) {
      redixConfig.configs = Object.keys(redixConfig.configs).map(processorName => {
         let processorConfig = redixConfig.configs[processorName];
         processorConfig.processorName = processorName;
         return processorConfig;
      });
   }
   assert(lodash.isArray(redixConfig.configs), 'isArray configs');
   return redixConfig;
}

async function getConfigsFromConfigurator(configuratorName, config) {
   console.log('getConfigsFromConfigurator', configuratorName);
   assert(configuratorName, 'configurator class name');
   let configurator = require('../' + configuratorName);
   if (/^[A-Z]/.test(path.basename(configuratorName))) {
      assert(lodash.isClass(configurator), 'Valid configurator class: ' + configuratorName);
      return new configuratorClass(redixConfig.configs, state.redixConfig);
   } else {
      assert(lodash.isFunction(configurator), 'Valid configurator function: ' + configuratorName);
      return configurator(config, state.redixConfig);
   }
   return configurator(config, state.redixConfig);
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
   console.log('getConfigsFromConfigDir', envConfig);
   if (!envConfig.configDir) {
      envConfig.configDir = envConfig.baseDir + '/config';
   }
   assert(fs.existsSync(configDir), 'exists configDir');
   return fs.readdirSync(configDir).filter(file => {
      if (file === 'redix.yaml') {
      } else if (lodash.endsWith(file, '.json')) {
      } else if (lodash.endsWith(file, '.yaml')) {
         return true;
      }
   }).map(file => {
      let config = readFileSyncYamlDirFile(dir, file);
      config.processorName = path.basename(file, '.yaml');
      logger.info('config', config);
      return config;
   });
}

function readFileSyncYamlDirFile(dir, yamlFile) {
   return readFileSyncYamlFile(Paths.join(dir, file));
}

function readFileSyncYamlFile(yamlFile) {
   return yaml.safeLoad(fs.readFileSync(yamlFile, 'utf8'));
}
