var redis = require('redis');

module.exports = function createRedisClient(redisConfig) {

    var bSocket = redisConfig.socket !== undefined && redisConfig.socket !== '';
    var client = bSocket ?
        redis.createClient(redisConfig.socket) :
        redis.createClient(redisConfig.port, redisConfig.host);

    client.nompEndpoint = bSocket ? redisConfig.socket : redisConfig.host + ':' + redisConfig.port;

    return client;
};
