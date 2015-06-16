
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import bunyan from 'bunyan';
import yaml from 'js-yaml';
import lodash from 'lodash';
//import Map from 'es6-map';

import Paths from './Paths';
import Redis from './Redis';
import Redix from './Redix';

start();

async function start() {
   try {
      const envConfig = extractConfigFromEnv(process.env);
      console.log('envConfig', envConfig);
      const redixConfig = await getConfig(envConfig);
      console.log('redixConfig', redixConfig);
      global.redixLoggerLevel = redixConfig.loggerLevel || 'debug';
      const logger = bunyan.createLogger({name: 'redix/start', level: global.redixLoggerLevel});
      const redix = new Redix(redixConfig);
      createProcessors(redix, getProcessorConfigs(redixConfig));
   } catch (e) {
      console.error(e, e.stack);
   }
}

function extractConfigFromEnv(env) {
   let { baseDir, configDir, configFile, loggerLevel, configKey } = env;
   let config = { baseDir, configDir, configFile };
   if (env.redisPort || env.redisHost) {
      config.redis = {
         port: env.redisPort || 6379,
         host: env.redisHost || 'localhost'
      };
   }
   config.loggerLevel = env.loggerLevel || 'debug';
   console.log('extractConfigFromEnv', config);
   return config;
}

async function getConfig(env) {
   console.log('getConfig', env);
   if (env.redis) {
      return getConfigFromRedis(env.redis);
   } else if (env.configFile) {
      env.baseDir = path.dirname(env.configFile);
      logger.debug('baseDir', env.baseDir);
   } else if (env.baseDir) {
      //console.error('baseDir', env.baseDir, env.baseDir.replace(/\/$/, ''));
      env.baseDir = env.baseDir.replace(/\/$/, '');
      env.configFile = Paths.joinPath(env.baseDir, 'redix.yaml');
   } else if (env.configDir) {
      env.baseDir = path.dirname(env.configDir);
      env.configFile = Paths.joinPath(env.baseDir, 'redix.yaml');
   } else {
      throw new Error('require env: configFile, configDir, or baseDir');
   }
   assert(env.baseDir, 'env.baseDir');
   return getConfigFromFile(env.configFile);
}

async function getConfigFromFile(configFile) {
   assert(configFile, 'configFile');
   //assert(await fs.exists(configFile), 'configFile must exist: ' + configFile);
   return yaml.safeLoad(fs.readFileSync(configFile, 'utf8'));
}

async function getConfigFromRedis(redisEnv) {
   logger.info(' getConfigFromRedis', redisEnv);
   const redis = new Redis();
   try {
      let reply = await redis.get(redisEnv.configKey);
      let config = JSON.parse(reply);
      return config;
   } finally {
      redis.end();
   }
}

function createProcessors(redix, configs) {
   logger.info('createProcessors', configs.map(config => config.processorName));
   configs.forEach(config => {
      config = decorateProcessorConfig(config);
      redix.setProcessor(config.processorName, createProcessor(config));
   });
}

function decorateProcessorConfig(config) {
   if (!config.loggerLevel) {
      config.loggerLevel = global.redixLoggerLevel;
   }
   return config;
}

function getProcessorConfigs(redixConfig) {
   console.log('getProcessorConfigs', redixConfig);
   if (redixConfig.configurator && !redixConfig.configurator.disabled) {
      assert(redixConfig.configs, 'require configs for configurator: ' + redixConfig.configurator);
      let configurator = require('../configurators/' + redixConfig.configurator);
      if (/^[A-Z]/.test(redixConfig.configurator)) {
         return new configurator(redixConfig.configs, redixConfig);
      } else {
         return configurator(redixConfig.configs, redixConfig);
      }
   } else {
      if (!redixConfig.configDir) {
         redixConfig.configDir = redixConfig.baseDir + '/config';
      }
      //assert(fs.existsSync(redixConfig.configDir), 'configDir not exists: ' + redixConfig.configDir);
      return readConfigDir(redixConfig.configDir);
   }
}

function createProcessor(config) {
   logger.info('createProcessor', config.processorName, config);
   let processor = require('../processors/' + config.processorClass);
   if (/^[a-z]+\.[a-z]/.test(config.processorName)) {
      return processor(config, global.redix);
   } else {
      return new processor(config, global.redix);
   }
}

function readYamlSync(dir, file) {
   return yaml.safeLoad(fs.readFileSync(dir + '/' + file, 'utf8'));
}

function readConfigDir(dir) {
   return fs.readdirSync(dir).filter(file => {
      if (file === redixConfigFile) {
      } else if (lodash.endsWith(file, '.json')) {
      } else if (lodash.endsWith(file, '.yaml')) {
         return true;
      }
   }).map(file => {
      let config = readYamlSync(dir, file);
      config.processorName = path.basename(file, '.yaml');
      let matcher = config.processorName.match(/(.*)\.([^\.]+)/);
      config.processorClass = matcher[1].replace(/\./g, '/');
      config.instanceName = matcher[2];
      logger.info('config', config);
      if (!config.startup) {
         if (config.type === 'importer' ||
               config.processorName.indexOf('importer') === 0) {
            config.startup = 80;
         } else if (config.type === 'exporter' ||
               config.processorName.indexOf('exporter') === 0) {
            config.startup = 20;
         } else {
            config.startup = 50;
         }
      }
      return config;
   }).sort((a, b) => a.startup > b.startup);
}
