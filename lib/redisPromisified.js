
import promisify from 'es6-promisify';
import redis from 'redis';

const redisClient = redis.createClient();
const names = ['exec', 'get', 'hgetall', 'lrange', 'zrevrange'];

names.forEach(name => {
   module.exports[name] = promisify(
     redisClient[name].bind(redisClient));
});

['end', 'multi'].forEach(name => {
  module.exports[name] =
     redisClient[name].bind(redisClient);
});
