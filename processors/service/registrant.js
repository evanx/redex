
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import lodash from 'lodash';
import path from 'path';

const RedexProcessorConfigs = RedexGlobal.require('lib/RedexProcessorConfigs');

export default function createRegistrant(config, redex, logger) {

   let cancelled = false;
   let count = 0;
   let registration;
   let deregistration;
   let monitorId;

   const address = config.address;
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
      logger.warn('revertPending', id, error);
      const pushLength = await redis.lpush(config.namespace + ':q', id);
      logger.warn('revertPending', id, pushLength, error, error.stack);
   }

   async function pop() {
      const id = await redis.brpoplpush(config.namespace + ':q',
         config.namespace + ':p', config.popTimeout);
      if (lodash.isEmpty(id)) {
         return;
      }
      await addedPending(id);
      try {
         if (cancelled) {
            return;
         }
         await register(id);
      } catch (err) {
         await revertPending(id, err);
         throw err;
      } finally {
         await removePending(id);
      }
   }

   async function register(id) {
      logger.debug('register', id);
      let time = await redis.timeSeconds();
      let expiry = ttl + time;
      registration = { id, address, expiry };
      logger.debug('registration', registration);
      let multi = redis.multi();
      multi.hmset(config.namespace + ':' + id, registration);
      multi.sadd(config.namespace + ':ids', id);
      logger.info('register multi');
      let results = await multi.exec();
      logger.debug('register multi', results);
   }

   async function deregister() {
      logger.debug('deregister', registration);
      deregistration = registration;
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
      logger.info('cancelled');
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
         logger.digest('unregistered');
      } else if (!registration.id) {
         logger.error('unregistered', registered);
      } else {
         try {
            let sismemberReply = await redis.sismember(config.namespace + ':ids', registration.id);
            if (!sismemberReply) {
               deregister();
               if (config.shutdown) {
                  cancelled = true;
               }
            } else {
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
         logger.info('state', registration, deregistration);
         return {
            config: RedexProcessorConfigs.summariseProcessorConfig(config),
            registration: registration,
            deregistration: deregistration
         };
      }
   };

   return service;
}
