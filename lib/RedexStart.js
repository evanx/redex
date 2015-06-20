
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

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
import Redex from './Redex';

import RedexConfigs from './RedexConfigs';

var state = {}, logger;

const configurators = {
   http: 'httpFileServer'
};

start();

async function start() {
   try {
      state.envConfig = createEnvConfig(process.env);
      state.redexConfig = await getConfigObject(state.envConfig);
      //state.redexConfig.baseDir = state.envConfig.baseDir;
      //state.redexConfig.env = state.envConfig;
      global.redexLoggerLevel = state.redexConfig.loggerLevel || 'debug';
      logger = bunyan.createLogger({name: 'redex/start', level: global.redexLoggerLevel});
      global.redex = state.redex = new Redex(state.redexConfig);
      RedexConfigs.createProcessors(redex, state.redexConfig.configs);
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
   console.log('args', args);
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
      let redexDir = __dirname.replace(/\lib$/, '');
      let builtinConfiguratorPath = Paths.join(redexDir, env.builtinConfiguratorFile);
      console.log('builtinConfiguratorPath', builtinConfiguratorPath);
      let config = yaml.safeLoad(builtinConfiguratorPath);
      let configs = await getConfigsFromConfigurator(env.builtinConfiguratorFile, config);
      return Object.assign({ configs }, {
         description: config.description,
         loggerLevel: config.loggerLevel
      });
   }
   if (!env.configurator) {
      let fileName = path.basename(env.configFile);
      if (fileName !== 'redex.yaml' && !env.configurator) {
         env.configurator = getConfiguratorClass(fileName);
      } else {
         env.baseDir = path.dirname(env.configFile);
         console.log('baseDir', env.baseDir, env.configFile);
      }
   }
   if (env.configurator) {
      console.log('configurator', env.configurator, env.configFile);
      let config = await readFileSyncYamlFile(env.configFile);
      config.configs = await getConfigsFromConfigurator(env.configFile, config);
      return config;
   }
   if (env.configFile) {
      console.log('configFile', env.configFile);
   } else if (env.configDir) {
      console.log('configDir', env.configDir);
      env.baseDir = path.dirname(env.configDir);
      env.configFile = Paths.join(env.baseDir, 'redex.yaml');
   } else if (env.baseDir) {
      console.log('baseDir', env.baseDir);
      env.baseDir = env.baseDir.replace(/\/$/, '');
      assert(fs.statSync(env.baseDir).isDirectory(), 'baseDir: ' + env.baseDir);
      env.configFile = Paths.join(env.baseDir, 'redex.yaml');
      env.configDir = env.baseDir + '/config';
   } else {
      assert(false, 'configFile, configDir, or baseDir');
   }
   assert(env.configFile, 'env.configFile');
   assert(fs.statSync(env.configFile).isFile(), 'configFile: ' + env.configFile);
   console.log('configFile', env.configFile);
   if (!env.baseDir) {
      env.baseDir = path.dirname(configFile);
   }
   let redexConfig = readFileSyncYamlFile(env.configFile);
   redexConfig.baseDir = env.baseDir;
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

async function getConfigsFromConfigurator(configuratorName, config) {
   let configuratorClass = getConfiguratorClass(configuratorName);
   console.log('getConfigsFromConfigurator', configuratorName, configuratorClass);
   let configurator = require('../' + configuratorClass);
   if (/^[A-Z]/.test(configuratorName)) {
      assert(lodash.isClass(configurator), 'Valid configurator class: ' + configuratorName);
      return new configurator(config, state.redexConfig);
   } else {
      assert(lodash.isFunction(configurator), 'Valid configurator function: ' + configuratorName);
      return configurator(config, state.redexConfig);
   }
}

function getConfiguratorClass(fileName) {
   fileName = path.basename(fileName);
   //console.log('getConfiguratorClass', fileName);
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
   return yaml.safeLoad(fs.readFileSync(yamlFile, 'utf8'));
}
