
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import bunyan from 'bunyan';
import yaml from 'js-yaml';
import lodash from 'lodash';
import util from 'util';
//import Map from 'es6-map';

import Files from './Files';
import Paths from './Paths';
import Redis from './Redis';
import Redix from './Redix';

import RedixConfigs from './RedixConfigs';

var state = {}, logger;

const configurators = {
   http: 'httpFileServer'
};

start();

async function start() {
   try {
      state.envConfig = createEnvConfig(process.env);
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
   console.info('args', args);
   let configurator;
   args.forEach(arg => {
     let configurator = configurators[arg];
     if (configurator) {
       assert(!envConfig.configurator, 'duplicate configurator');
       assert(!envConfig.configFile, 'configFile');
       envConfig.configurator = configurator;
       envConfig.builtinConfiguratorFile = util.format('config/configurator.%s.default.yaml', configurator);
     } else if (arg === 'debug') {
       assert(envConfig.loggerLevel, 'duplicate loggerLevel');
       envConfig.loggerLevel = 'debug';
     } else if (arg === 'info') {
       assert(envConfig.loggerLevel, 'duplicate loggerLevel');
       envConfig.loggerLevel = 'info';
     } else {
       throw new AssertionError('argument: ' + arg);
     }
   });
}

async function getConfigObject(env) {
   if (env.redis) {
      return getConfigFromRedis(env.redis);
   }
   if (env.builtinConfiguratorFile) {
      let redixDir = __dirname.replace(/\lib$/, '');
      let builtinConfiguratorPath = Paths.join(redixDir, env.builtinConfiguratorFile);
      console.info('builtinConfiguratorPath', builtinConfiguratorPath);
      let config = yaml.safeLoad(builtinConfiguratorPath);
      let configs = await getConfigsFromConfigurator(env.builtinConfiguratorFile, config);
      return Object.assign({ configs }, {
         description: config.description,
         loggerLevel: config.loggerLevel
      });
   }
   if (!env.configurator) {
      let fileName = path.basename(env.configFile);
      if (fileName !== 'redix.yaml' && !env.configurator) {
         env.configurator = getConfiguratorClass(fileName);
      } else {
         env.baseDir = path.dirname(env.configFile);
         console.info('baseDir', env.baseDir, env.configFile);
      }
   }
   if (env.configurator) {
      console.info('configurator', env.configurator, env.configFile);
      let config = await readFileSyncYamlFile(env.configFile);
      config.configs = await getConfigsFromConfigurator(env.configFile, config);
      return config;
   }
   if (env.configFile) {
   } else if (env.baseDir) {
      env.baseDir = env.baseDir.replace(/\/$/, '');
      env.configFile = Paths.join(env.baseDir, 'redix.yaml');
      if (!env.configDir) {
         env.configDir = env.baseDir + '/config';
      }
   } else if (env.configDir) {
      env.baseDir = path.dirname(env.configDir);
      env.configFile = Paths.join(env.baseDir, 'redix.yaml');
   } else {
      throw new Error('Require environment: configFile, configDir, or baseDir');
   }
   assert(env.configFile, 'env.configFile');
   console.log('configFile', env.configFile);
   let redixConfig = readFileSyncYamlFile(env.configFile);
   if (!redixConfig.configs) {
      redixConfig.configs = await getConfigsFromConfigDir(env);
   }
   if (!lodash.isArray(redixConfig.configs) && lodash.isObject(redixConfig.configs)) {
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
   let configuratorClass = getConfiguratorClass(configuratorName);
   console.log('getConfigsFromConfigurator', configuratorName, configuratorClass);
   let configurator = require('../' + configuratorClass);
   if (/^[A-Z]/.test(configuratorName)) {
      assert(lodash.isClass(configurator), 'Valid configurator class: ' + configuratorName);
      return new configurator(config, state.redixConfig);
   } else {
      assert(lodash.isFunction(configurator), 'Valid configurator function: ' + configuratorName);
      return configurator(config, state.redixConfig);
   }
}

function getConfiguratorClass(fileName) {
   fileName = path.basename(fileName);
   //console.info('getConfiguratorClass', fileName);
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
   console.log('getConfigsFromConfigDir', envConfig);
   if (!envConfig.configDir) {
      envConfig.configDir = envConfig.baseDir + '/config';
   }
   assert(fs.existsSync(envConfig.configDir), 'exists configDir');
   return fs.readdirSync(envConfig.configDir).filter(file => {
      if (file === 'redix.yaml') {
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
   return yaml.safeLoad(fs.readFileSync(yamlFile, 'utf8'));
}
