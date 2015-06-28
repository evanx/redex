
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import lodash from 'lodash';
import path from 'path';

const Paths = RedexGlobal.require('util/Paths');
const Promises = RedexGlobal.require('util/Promises');
const Redis = RedexGlobal.require('util/Redis');
const Seconds = RedexGlobal.require('util/Seconds');
const Millis = RedexGlobal.require('util/Millis');

export default function createProcessor(config, redex, logger) {

   logger.debug('config', config);

   assert(config.namespace, 'namespace');
   assert(config.address, 'address');
   Millis.assert(config.timeout, 'timeout');
   logger.info('timeout', typeof config.timeout, lodash.isNumber(config.timeout));
   const timeout = Millis.parse(config.timeout)/1000;
   assert(timeout > 1, 'timeout: ' + timeout);
   assert(timeout < 90, 'timeout: ' + timeout);

   let cancelled = false;
   let count = 0;
   let registration;

   const redis = new Redis({});
   const popTimeout = config.popTimeout || 1;
   const errorDelay = config.errorDelay || 2000;
   const registerDelay = config.registerDelay || 2000;
   const monitorInterval = config.monitorInterval || 1000;

   function addedPending(popReply, messageId) {
      logger.debug('addPending', messageId);
   }

   function removePending(popReply, messageId) {
      logger.debug('removePending', messageId);
   }

   function revertPending(popReply, messageId, error) {
      logger.warn('revertPending:', messageId, error, error.stack);
   }

   async function pop() {
      const popReply = await redis.brpoplpush(config.namespace + ':in',
      config.namespace + ':pending', popTimeout);
      if (popReply === null) {
         return null;
      }
      let message = JSON.parse(popReply);
      count += 1;
      const messageId = count;
      try {
         logger.debug('pop', message);
         assert(message.id, 'id');
         let setReply = await redis.sadd(config.namespace + ':ids', message.id);
         if (setReply !== 1) {
            logger.warn('setReply', setReply);
         }
         let hashesReply = await redis.hmset(config.namespace + ':' + message.id, message);
         removePending(popReply, messageId);
         return message;
      } catch (err) {
         revertPending(popReply, messageId, err);
         throw err;
      }
   }

   async function monitor() {
      if (!registration) {
         logger.debug('unregistered');
      } else if (!registration.id) {
         logger.error('unregistered', registered);
      } else {
         try {
            let sismemberReply = await redis.sismember(config.namespace + ':ids', registration.id);
            if (sismemberReply) {
               let serverTime = await redis.time();
               let time = serverTime[0];
               if (registration.deadline) {
                  if (time > registration.deadline) {
                     logger.warn('expired', registration, time);
                     if (config.shutdown) {
                        cancelled = true;
                        redex.end();
                     }
                  } else if (time > registration.deadline - timeout*2) {
                     logger.info('expiring', registration, time, timeout);
                  } else {
                     let ttl = registration.deadline - time;
                     logger.debug('registered', registration, time, ttl);
                  }
               } else {
                  logger.debug('no deadline', registration);
               }
            } else {
               deregister();
               if (config.shutdown) {
                  cancelled = true;
                  redex.end();
               }
            }
         } catch (err) {
            logger.warn(err);
         }
      }
   }

   async function deregister() {
      logger.debug('deregister', registration);
      registration = null;
   }

   async function register() {
      registration = await pop();
      if (!registration) {
         return;
      }
   }

   async function run() {
      while (!cancelled) {
         try {
            if (!registration) {
               await register();
            } else {
               await Promises.delay(registerDelay);
            }
         } catch (err) {
            logger.warn(err);
            await Promises.delay(errorDelay);
         }
      }
   }

   const service = {
      init() {
      },
      async start() {
         redis.init();
         setTimeout(() => run(), 0);
         setInterval(() => monitor(), monitorInterval);
         logger.info('start', config);
      },
      end() {
         cancelled = true;
         redis.end();
      },
      get state() {
         return { config: config.summary };
      }
   };

   return service;
}
