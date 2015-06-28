
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

   assert(config.namespace, 'namespace');
   assert(config.address, 'address');

   const ttl = Seconds.parse(config.ttl);
   let shutdown = false;
   let cancelled = false;
   let count = 0;
   let registration;

   assert(ttl > 0, 'ttl');

   const redis = new Redis({});
   const popTimeout = config.popTimeout || 1;
   const errorDelay = config.errorDelay || 2000;
   const registerDelay = config.registerDelay || 2000;
   const monitorInterval = config.monitorInterval || 1000;

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
         returnl
      }
      assert(!shutdown);
      const id = await redis.brpoplpush(config.namespace + ':q',
         config.namespace + ':p', popTimeout);
      if (lodash.isEmpty(id)) {
         return null;
      }
      addedPending(id);
      try {
         assert(!shutdown);
         if (cancelled) {
            return null;
         }
         logger.debug('pop', id);
         let addCount = await redis.sadd(config.namespace + ':ids', id);
         if (addCount !== 1) {
            logger.warn('sadd', id, addCount);
         }
         let setCount = await redis.hset(config.namespace + ':' + id, id);
         if (setCount != 1) {
            logger.warn('hset', id, setCount);
         }
         //throw new Error('test');
         return id;
      } catch (err) {
         revertPending(id, err);
         throw err;
      } finally {
         removePending(id);
      }
   }

   async function monitor() {
      if (cancelled) {
         logger.warn('monitor: cancelled');
         return;
      }
      assert(!shutdown);
      if (!registration) {
         logger.debug('unregistered');
      } else if (!registration.id) {
         logger.error('unregistered', registered);
      } else {
         try {
            let sismemberReply = await redis.sismember(config.namespace + ':ids', registration.id);
            if (sismemberReply) {
               let time = await redis.timeSeconds();
               if (registration.ttd) {
                  if (time > registration.ttd) {
                     logger.warn('expired', registration, time);
                     if (config.shutdown) {
                        cancelled = true;
                     }
                  } else {
                     let ttl = registration.ttd - time;
                     logger.debug('registered', {registration, time, ttl});
                  }
               } else {
                  logger.warn('no ttd', registration);
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

   async function deregister() {
      logger.debug('deregister', registration);
      registration = null;
   }

   async function register() {
      assert(!registration, 'unregistered');
      let id = await pop();
      if (!id) {
         return;
      }
      let time = await redis.timeSeconds();
      let ttd = ttl + time;
      registration = { id, ttd };
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
      shutdown = true;
      redis.end();
      if (config.shutdown) {
         redex.end();
      }
   }

   let monitorId;

   const service = {
      init() {
      },
      async start() {
         redis.init();
         setTimeout(() => run(), 0);
         monitorId = setInterval(() => monitor(), monitorInterval);
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
      },
      get state() {
         return { config: config.summary };
      }
   };

   return service;
}
