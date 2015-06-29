
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

export default function createRegistrant(config, redex, logger) {

   let cancelled = false;
   let count = 0;
   let registration;
   let monitorId;

   const ttl = Seconds.parse(config.ttl);

   assert(ttl > 0, 'ttl');

   const redis = new Redis({});

   async function addedPending(id) {
      while (true) {
         const lid = await redis.rpop(config.namespace + ':p', 0, -1);
         if (lid) {
            const reply = await redis.sadd(config.namespace + ':ps', lid);
            if (lid !== id) {
               logger.warn('addPending lpop', id, lid, reply);
            } else {
               logger.debug('addPending lpop', id, reply);
            }
         } else {
            return;
         }
      }
   }

   async function removePending(id) {
      const remCount = await redis.srem(config.namespace + ':ps', id);
      if (remCount !== 1) {
         logger.warn('removePending', id, remCount);
      } else {
         logger.debug('removePending', id);
      }
   }

   async function revertPending(id, error) {
      const pushLength = await redis.lpush(config.namespace + ':q', id);
      logger.warn('revertPending', id, pushLength, error, error.stack);
   }

   async function pop() {
      if (cancelled) {
         logger.warn('pop: cancelled');
         return;
      }
      const id = await redis.brpoplpush(config.namespace + ':q',
         config.namespace + ':p', config.popTimeout);
      if (lodash.isEmpty(id)) {
         return;
      }
      addedPending(id);
      try {
         if (cancelled) {
            return;
         }
         register(id);
      } catch (err) {
         revertPending(id, err);
         throw err;
      } finally {
         removePending(id);
      }
   }

   async function register(id) {
      logger.debug('register', id);
      let addCount = await redis.sadd(config.namespace + ':ids', id);
      if (addCount !== 1) {
         logger.warn('sadd', id, addCount);
      }
      let time = await redis.timeSeconds();
      let expiry = ttl + time;
      registration = { id, expiry };
      let setCount = await redis.hmset(config.namespace + ':' + id, registration);
      if (setCount != 1) {
         logger.debug('hmset', id, setCount);
      }
   }

   async function deregister() {
      logger.debug('deregister', registration);
      registration = null;
   }

   async function run() {
      while (!cancelled) {
         try {
            if (!registration) {
               await pop();
            } else {
               await Promises.delay(config.registerDelay);
            }
         } catch (err) {
            logger.warn(err);
            await Promises.delay(config.errorDelay);
         }
      }
      if (config.shutdown) {
         redex.end();
      }
   }

   async function monitor() {
      if (cancelled) {
         logger.warn('monitor: cancelled');
         return;
      }
      if (!registration) {
         logger.debug('unregistered');
      } else if (!registration.id) {
         logger.error('unregistered', registered);
      } else {
         try {
            let sismemberReply = await redis.sismember(config.namespace + ':ids', registration.id);
            if (sismemberReply) {
               let time = await redis.timeSeconds();
               if (registration.expiry) {
                  if (time > registration.expiry) {
                     logger.warn('expired', registration, time);
                     if (config.shutdown) {
                        cancelled = true;
                     }
                  } else {
                     let ttl = registration.expiry - time;
                     logger.debug('registered', {registration, time, ttl});
                  }
               } else {
                  logger.warn('no expiry', registration);
               }
            } else {
               deregister();
               if (config.shutdown) {
                  cancelled = true;
               }
            }
         } catch (err) {
            logger.warn(err);
         }
      }
   }

   const service = {
      init() {
      },
      async start() {
         redis.init();
         setTimeout(() => run(), 0);
         monitorId = setInterval(() => monitor(), config.monitorInterval);
         logger.info('start', config.address, ttl);
      },
      end() {
         cancelled = true;
         if (monitorId) {
            clearInterval(monitorId);
            logger.info('end');
         } else {
            logger.warn('end');
         }
         redis.end();
      },
      get state() {
         return { config: config.summary };
      }
   };

   return service;
}
