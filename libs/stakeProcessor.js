var redis = require('redis');
var Stratum = require('cryptocurrency-stratum-pool');
var CreateRedisClient = require('./createRedisClient.js');

/*
This module deals with handling stakes when in internal payment processing mode. It connects to a redis
database and inserts shares with the database structure of:

key: coin_name + ':' + block_height
value: a hash with..
        key:

 */



module.exports = function(logger, poolConfig){

    var redisConfig = poolConfig.redis;
    var coin = poolConfig.coin.name;


    var forkId = process.env.forkId;
    var logSystem = 'Pool';
    var logComponent = coin;
    var logSubCat = 'Thread ' + (parseInt(forkId) + 1);
    
    var connection = CreateRedisClient(redisConfig);
    if (redisConfig.password) {
        connection.auth(redisConfig.password);
    }

    connection.on('ready', function(){
        logger.debug(logSystem, logComponent, logSubCat, 'Share processing setup with redis (' + redisConfig.host +
            ':' + redisConfig.port  + ')');
    });
    connection.on('error', function(err){
        logger.error(logSystem, logComponent, logSubCat, 'Redis client had an error: ' + JSON.stringify(err))
    });
    connection.on('end', function(){
        logger.error(logSystem, logComponent, logSubCat, 'Connection to redis database has been ended');
    });

    connection.info(function(error, response){
        if (error){
            logger.error(logSystem, logComponent, logSubCat, 'Redis version check failed');
            return;
        }
        var parts = response.split('\r\n');
        var version;
        var versionString;
        for (var i = 0; i < parts.length; i++){
            if (parts[i].indexOf(':') !== -1){
                var valParts = parts[i].split(':');
                if (valParts[0] === 'redis_version'){
                    versionString = valParts[1];
                    version = parseFloat(versionString);
                    break;
                }
            }
        }
        if (!version){
            logger.error(logSystem, logComponent, logSubCat, 'Could not detect redis version - but be super old or broken');
        }
        else if (version < 2.6){
            logger.error(logSystem, logComponent, logSubCat, "You're using redis version " + versionString + " the minimum required version is 2.6. Follow the damn usage instructions...");
        }
    });

    var opidCount = 0;
    var opids = [];

    // zcash team recommends 10 confirmations for safety from orphaned blocks
    var minConfShield = Math.max((poolOptions.paymentProcessing.minConf || 10), 1); // Don't allow 0 conf transactions.
    var minConfPayout = Math.max((poolOptions.paymentProcessing.minConf || 10), 1);
    if (minConfPayout < 3) {
        logger.warning(logSystem, logComponent, logComponent + ' minConf of 3 is recommended.');
    }

    // minimum stakingInterval of 60 seconds
    var stakingIntervalSecs = Math.max((poolOptions.stakingInterval || 120), 30);
    if (parseInt(poolOptions.stakingInterval) < 120) {
        logger.warning(logSystem, logComponent, ' minimum stakingInterval of 120 seconds recommended.');
    }

    var requireShielding = poolOptions.coin.requireShielding === true;
    var fee = parseFloat(poolOptions.coin.txfee) || parseFloat(0.0004);

    var daemon = new Stratum.daemon.interface([poolOptions.paymentProcessing.daemon], function (severity, message) {
        logger[severity](logSystem, logComponent, message);
    });

    function validateAddress (callback){
        daemon.cmd('validateaddress', [poolOptions.address], function (result) {
            if (result.error) {
                logger.error(logSystem, logComponent, 'Error with payment processing daemon ' + JSON.stringify(result.error));
                callback(true);
            }
            else if (!result.response || result.response.ismine === false) {
                logger.error(logSystem, logComponent,
                    'Daemon does not own pool address - payment processing can not be done with this daemon, '
                    + JSON.stringify(result.response));
                callback(true);
            }
            else {
                callback()
            }
        }, true);
    }

    function validateTAddress (callback) {
        daemon.cmd('validateaddress', [poolOptions.stakeAddress], function(result) {
            if (result.error){
                logger.error(logSystem, logComponent, 'Error with payment processing daemon (validateTAddress) ' + JSON.stringify(result.error));
                callback(true);
            }
            else if (!result.response || !result.response.ismine) {
                logger.error(logSystem, logComponent,
                    'Daemon does not own pool address - payment processing can not be done with this daemon, '
                    + JSON.stringify(result.response));
                callback(true);
            }
            else{
                callback()
            }
        }, true);
     }

     function validateZAddress (callback) {
        daemon.cmd('z_validateaddress', [poolOptions.izAddress], function(result) {
            if (result.error){
                logger.error(logSystem, logComponent, 'Error with payment processing daemon (validateZAddress) ' + JSON.stringify(result.error));
                callback(true);
            }
            else if (!result.response || !result.response.ismine) {
                logger.error(logSystem, logComponent,
                    'Daemon does not own pool address - payment processing can not be done with this daemon, '
                    + JSON.stringify(result.response));
                callback(true);
            }
            else{
                callback()
            }
        }, true);
    }

    function getBalance(callback) {
        daemon.cmd('getbalance', [], function (result) {
            var wasICaught = false;
            if (result.error) {
                callback(true);
                return;
            }
            try {
                var d = result.data.split('result":')[1].split(',')[0].split('.')[1];
                magnitude = parseInt('10' + new Array(d.length).join('0'));
                minPaymentSatoshis = parseInt(poolOptions.paymentProcessing.minimumPayment * magnitude);
                coinPrecision = magnitude.toString().length - 1;
            }
            catch (e) {
                logger.error(logSystem, logComponent, 'Error detecting number of satoshis in a coin, cannot do payment processing. Tried parsing: ' + result.data);
                wasICaught = true;
            }
            finally {
                if (wasICaught) {
                    callback(true);
                } else {
                    callback();
                }
            }
        }, true, true);
    }

    function asyncComplete(err){
        if (err){
            setupFinished(false);
            return;
        }
        if (stakingInterval) {
            clearInterval(stakingInterval);
        }
        stakingInterval = setInterval(function () {
            try {
                processStakes();
            } catch (e) {
                throw e;
            }
        }, stakingIntervalSecs * 1000);
        setupFinished(true);
    }

    if (!poolOptions.coin.isZCashProtocol) {
        async.parallel([validateAddress, getBalance], asyncComplete);
    } else if (requireShielding === true) {
        async.parallel([validateAddress, validateTAddress, validateZAddress, getBalance], asyncComplete);
    } else {
        async.parallel([validateAddress, validateTAddress, getBalance], asyncComplete);
    }

    //get t_address coinbalance
    function listUnspent (addr, notAddr, minConf, displayBool, callback) {
        if (addr !== null) {
            var args = [minConf, 99999999, [addr]];
        } else {
            addr = 'Payout wallet';
            var args = [minConf, 99999999];
        }
        daemon.cmd('listunspent', args, function (result) {
            if (!result || result.error || result[0].error) {
                logger.error(logSystem, logComponent, 'Error with RPC call listunspent '+addr+' '+JSON.stringify(result[0].error));
                callback = function (){};
                callback(true);
            }
            else {
                var transactionHashes = [];
                var tBalance = parseFloat(0);
                if (result[0].response != null && result[0].response.length > 0) {
                    for (var i = 0, len = result[0].response.length; i < len; i++) {
                        if (result[0].response[i].address && result[0].response[i].address !== notAddr) {
                            transactionHashes.push(result[0].response[i].txid);
                            tBalance += parseFloat(result[0].response[i].amount || 0);
                        }
                    }
                    tBalance = coinsRound(tBalance);
                }
                if (displayBool === true) {
                    logger.special(logSystem, logComponent, addr+' balance of ' + tBalance);
                }

                callback(function(err) {
                    if (err)
                        return;
                    // TODO: Handle moving from stakesTPending to stakesZPending
                }, details);
            }
        });
    }

    // get z_address coinbalance
    function listUnspentZ (addr, minConf, displayBool, callback) {
        if (addr !== null) {
            var args = [minConf, 99999999, [addr]];
        } else {
            addr = 'Payout wallet';
            var args = [minConf, 99999999];
        }
        daemon.cmd('z_listunspent', args, function (result) {
            if (!result || result.error || result[0].error) {
                logger.error(logSystem, logComponent, 'Error with RPC call z_getbalance '+addr+' '+JSON.stringify(result[0].error));
                callback = function (){};
                callback(true);
            }
            else {
                var transactionHashes = [];
                var zBalance = parseFloat(0);
                if (result[0].response != null && result[0].response.length > 0) {
                    for (var i = 0, len = result[0].response.length; i < len; i++) {
                        transactionHashes.push(result[0].response[i].txid);
                        zBalance += parseFloat(result[0].response[i].amount || 0);
                    }
                    zBalance = coinsRound(zBalance);
                }

                if (displayBool === true) {
                    logger.special(logSystem, logComponent, addr.substring(0,14) + '...' + addr.substring(addr.length - 14) + ' balance: '+(zBalance).toFixed(8));
                }

                callback(function(err) {
                    if (err)
                        return;
                    // TODO: Handle moving from stakesZPending to stakesPendingConfirms
                }, coinsToSatoshies(zBalance));
            }
        });
    }

    //send t_address balance to z_address
    function sendTToZ (callback, tBalance) {
        if (callback === true)
            return;
        if (tBalance === NaN) {
            logger.error(logSystem, logComponent, 'tBalance === NaN for sendTToZ');
            return;
        }
        if ((tBalance - 10000) <= 0)
            return;

        // do not allow more than a single z_sendmany operation at a time
        if (opidCount > 0) {
            logger.warning(logSystem, logComponent, 'sendTToZ is waiting, too many z_sendmany operations already in progress.');
            return;
        }

        var amount = satoshisToCoins(tBalance - 10000);
        var params = [poolOptions.stakeAddress, [{'address': poolOptions.izAddress, 'amount': amount}]];
        daemon.cmd('z_sendmany', params,
            function (result) {
                //Check if payments failed because wallet doesn't have enough coins to pay for tx fees
                if (!result || result.error || result[0].error || !result[0].response) {
                    logger.error(logSystem, logComponent, 'Error trying to shield balance '+amount+' '+JSON.stringify(result[0].error));
                    callback = function (){};
                    callback(true);
                }
                else {
                    var opid = (result.response || result[0].response);
                    opidCount++;
                    opids.push(opid);
                    logger.special(logSystem, logComponent, 'Shield balance ' + amount + ' ' + opid);
                    callback = function (){};
                    callback(null);
                }
            }
        );
    }

    // send z_address balance to t_address
    function sendZToT (callback, zBalance) {
        if (callback === true)
            return;
        if (zBalance === NaN) {
            logger.error(logSystem, logComponent, 'zBalance === NaN for sendZToT');
            return;
        }
        if ((zBalance - 10000) <= 0)
            return;

        // do not allow more than a single z_sendmany operation at a time
        if (opidCount > 0) {
            logger.warning(logSystem, logComponent, 'sendZToT is waiting, too many z_sendmany operations already in progress.');
            return;
        }

        var amount = satoshisToCoins(zBalance - 10000);

        var params = [poolOptions.izAddress, [{'address': poolOptions.address, 'amount': amount}]];
        daemon.cmd('z_sendmany', params,
            function (result) {
                //Check if payments failed because wallet doesn't have enough coins to pay for tx fees
                if (!result || result.error || result[0].error || !result[0].response) {
                    logger.error(logSystem, logComponent, 'Error trying to send z_address coin balance to payout t_address.'+JSON.stringify(result[0].error));
                    callback = function (){};
                    callback(true);
                }
                else {
                    var opid = (result.response || result[0].response);
                    opidCount++;
                    opids.push(opid);
                    logger.special(logSystem, logComponent, 'Unshield funds for payout ' + amount + ' ' + opid);
                    callback = function (){};
                    callback(null);
                }
            }
        );
    }

    if (!!poolOptions.coin.isZCashProtocol) {
        // run shielding process every x minutes
        var shieldIntervalState = 0; // do not send ZtoT and TtoZ and same time, this results in operation failed!
        var shielding_interval = Math.max(parseInt(poolOptions.walletInterval || 1), 1) * 60 * 1000; // run every x minutes

        // check operation statuses every 57 seconds
        var opid_interval =  57 * 1000;
        // shielding not required for some equihash coins
        if (requireShielding === true) {
            var shieldInterval = setInterval(function() {
                shieldIntervalState++;
                switch (shieldIntervalState) {
                    case 1:
                        listUnspent(poolOptions.stakeAddress, null, minConfShield, false, sendTToZ);
                        break;
                    default:
                        listUnspentZ(poolOptions.izAddress, minConfShield, false, sendZToT);
                        shieldIntervalState = 0;
                        break;
                }
            }, shielding_interval);

            var checkOpids = function() {
                clearTimeout(opidTimeout);
                var checkOpIdSuccessAndGetResult = function(ops) {
                    var batchRPC = [];
                    // if there are no op-ids
                    if (ops.length == 0) {
                        // and we think there is
                        if (opidCount !== 0) {
                            // clear them!
                            opidCount = 0;
                            opids = [];
                            logger.warning(logSystem, logComponent, 'Clearing operation ids due to empty result set.');
                        }
                    }
                    // loop through op-ids checking their status
                    ops.forEach(function(op, i){
                        // check operation id status
                        if (op.status == "success" || op.status == "failed") {
                            // clear operation id result
                            var opid_index = opids.indexOf(op.id);
                            if (opid_index > -1) {
                                // clear operation id count
                                batchRPC.push(['z_getoperationresult', [[op.id]]]);
                                opidCount--;
                                opids.splice(opid_index, 1);
                            }
                            // log status to console
                            if (op.status == "failed") {
                                if (op.error) {
                                  logger.error(logSystem, logComponent, "Shielding operation failed " + op.id + " " + op.error.code +", " + op.error.message);
                                } else {
                                  logger.error(logSystem, logComponent, "Shielding operation failed " + op.id);
                                }
                            } else {
                                logger.special(logSystem, logComponent, 'Shielding operation success ' + op.id + '  txid: ' + op.result.txid);
                            }
                        } else if (op.status == "executing") {
                            logger.special(logSystem, logComponent, 'Shielding operation in progress ' + op.id );
                        }
                    });
                    // if there are no completed operations
                    if (batchRPC.length <= 0) {
                        opidTimeout = setTimeout(checkOpids, opid_interval);
                        return;
                    }
                    // clear results for completed operations
                    daemon.batchCmd(batchRPC, function(error, results){
                        if (error || !results) {
                            opidTimeout = setTimeout(checkOpids, opid_interval);
                            logger.error(logSystem, logComponent, 'Error with RPC call z_getoperationresult ' + JSON.stringify(error));
                            return;
                        }
                        // check result execution_secs vs pool_config
                        results.forEach(function(result, i) {
                            if (result.result[i] && parseFloat(result.result[i].execution_secs || 0) > shielding_interval) {
                                logger.warning(logSystem, logComponent, 'Warning, walletInverval shorter than opid execution time of '+result.result[i].execution_secs+' secs.');
                            }
                        });
                        // keep checking operation ids
                        opidTimeout = setTimeout(checkOpids, opid_interval);
                    });
                };

                // check for completed operation ids
                daemon.cmd('z_getoperationstatus', null, function (result) {
                    var err = false;
                    if (result.error) {
                        err = true;
                        logger.error(logSystem, logComponent, 'Error with RPC call z_getoperationstatus ' + JSON.stringify(result.error));
                    } else if (result.response) {
                        checkOpIdSuccessAndGetResult(result.response);
                    } else {
                        err = true;
                        logger.error(logSystem, logComponent, 'No response from z_getoperationstatus RPC call.');
                    }
                    if (err === true) {
                        opidTimeout = setTimeout(checkOpids, opid_interval);
                        if (opidCount !== 0) {
                            opidCount = 0;
                            opids = [];
                            logger.warning(logSystem, logComponent, 'Clearing operation ids due to RPC call errors.');
                        }
                    }
                }, true, true);
            }
            var opidTimeout = setTimeout(checkOpids, opid_interval);
        }
    }

    function roundTo(n, digits) {
        if (digits === undefined) {
            digits = 0;
        }
        var multiplicator = Math.pow(10, digits);
        n = parseFloat((n * multiplicator).toFixed(11));
        var test =(Math.round(n) / multiplicator);
        return +(test.toFixed(digits));
    }

    var satoshisToCoins = function (satoshis) {
        return roundTo((satoshis / magnitude), coinPrecision);
    };

    var coinsToSatoshies = function (coins) {
        return Math.round(coins * magnitude);
    };

    function coinsRound(number) {
        return roundTo(number, coinPrecision);
    }

    var processStakes = function () {

        var startProcess = Date.now();

        var timeSpentRPC = 0;
        var timeSpentRedis = 0;

        var startTimeRedis;
        var startTimeRPC;

        var startRedisTimer = function () { startTimeRedis = Date.now() };
        var endRedisTimer = function () { timeSpentRedis += Date.now() - startTimeRedis };

        var startRPCTimer = function () { startTimeRPC = Date.now(); };
        var endRPCTimer = function () { timeSpentRPC += Date.now() - startTimeRedis };

        async.waterfall([

            /* Call redis to get an array of rounds - which are coinbase transactions and block heights from submitted
               blocks. */
            function (callback) {

                startRedisTimer();
                redisClient.smembers(coin + ':stakesPendingConfirms', function (error, results) {
                    endRedisTimer();

                    if (error) {
                        logger.error(logSystem, logComponent, 'Could not get stakes from redis ' + JSON.stringify(error));
                        callback(true);
                        return;
                    }

                    var stakes = results.map(function (r) {
                        var details = r.split(':');
                        return {
                            blockHash: details[0],
                            txHash: details[1],
                            height: details[2],
                            stakeholder: details[3],
                            time: details[4],
                            serialized: r
                        };
                    });

                    stakes.sort(function(a, b) {
                        return a.height - b.height;
                    });

                    callback(null, stakes);
                });
            },

            /* Does a batch rpc call to daemon with all the transaction hashes to see if they are confirmed yet.
               It also adds the block reward amount to the round object - which the daemon gives also gives us. */
            function (stakes, callback) {

                var batchRPCcommand = rounds.map(function (r) {
                    return ['gettransaction', [r.txHash]];
                });

                startRPCTimer();
                daemon.batchCmd(batchRPCcommand, function (error, txDetails) {
                    endRPCTimer();

                    if (error || !txDetails) {
                        logger.error(logSystem, logComponent, 'Check finished - daemon rpc error with batch gettransactions '
                            + JSON.stringify(error));
                        callback(true);
                        return;
                    }

                    txDetails.forEach(function (tx, i) {
                        var stake = stakes[i];
                        if (tx && tx.result) {
                            stake.confirmations = parseInt((tx.result.confirmations || 0));
                        }

                        if (tx.error && tx.error.code === -5) {
                            logger.warning(logSystem, logComponent, 'Daemon reports invalid transaction: ' + stake.txHash);
                            stake.category = 'kicked';
                            return;
                        }
                        else if (!tx.result.details || (tx.result.details && tx.result.details.length === 0)) {
                            logger.warning(logSystem, logComponent, 'Daemon reports no details for transaction: ' + stake.txHash);
                            stake.category = 'kicked';
                            return;
                        }
                        else if (tx.error || !tx.result) {
                            logger.error(logSystem, logComponent, 'Odd error with gettransaction ' + stake.txHash + ' '
                                + JSON.stringify(tx));
                            return;
                        }
                    });

                    stakes = stakes.filter(function (s) {
                        switch (s.category) {
                            case 'kicked':
                                s.canDeleteStakes = true;
                            case 'received':
                                return true;
                            default:
                                return false;
                        }
                    });

                    callback(null, stakes);
                });
            },

            function (workers, rounds, paymentsUpdate, callback) {

                var totalPaid = parseFloat(0);

                var immatureUpdateCommands = [];
                var balanceUpdateCommands = [];
                var workerPayoutsCommand = [];

                for (var w in workers) {
                    var worker = workers[w];
                    if ((worker.balanceChange || 0) !== 0) {
                        balanceUpdateCommands.push([
                            'hincrbyfloat',
                            coin + ':balances',
                            w,
                            satoshisToCoins(worker.balanceChange)
                        ]);
                    }
                    if ((worker.sent || 0) > 0) {
                        workerPayoutsCommand.push(['hincrbyfloat', coin + ':payouts', w, coinsRound(worker.sent)]);
                        totalPaid = coinsRound(totalPaid + worker.sent);
                    }

                    if ((worker.immature || 0) > 0) {
                        immatureUpdateCommands.push(['hset', coin + ':immature', w, worker.immature]);
                    } else {
                        immatureUpdateCommands.push(['hset', coin + ':immature', w, 0]);
                    }
                }

                var movePendingCommands = [];
                var roundsToDelete = [];
                var orphanMergeCommands = [];

                var confirmsUpdate = [];
                var confirmsToDelete = [];

                var moveSharesToCurrent = function (r) {
                    var workerShares = r.workerShares;
                    if (workerShares != null) {
                        Object.keys(workerShares).forEach(function (worker) {
                            orphanMergeCommands.push(['hincrby', coin + ':shares:roundCurrent', worker, workerShares[worker]]);
                        });
                    }
                };

                rounds.forEach(function (r) {
                    switch (r.category) {
                        case 'kicked':
                            movePendingCommands.push(['smove', coin + ':blocksPending', coin + ':blocksKicked', r.serialized]);
                        case 'orphan':
                            movePendingCommands.push(['smove', coin + ':blocksPending', coin + ':blocksOrphaned', r.serialized]);
                            confirmsToDelete.push(['hdel', coin + ':blocksPendingConfirms', r.blockHash]);
                            if (!r.soloMined && r.canDeleteShares) {
                                moveSharesToCurrent(r);
                                roundsToDelete.push(coin + ':shares:round' + r.height);
                            }
                            return;
                        case 'immature':
                            confirmsUpdate.push(['hset', coin + ':blocksPendingConfirms', r.blockHash, (r.confirmations || 0)]);
                            return;
                        case 'generate':
                            confirmsToDelete.push(['hdel', coin + ':blocksPendingConfirms', r.blockHash]);
                            movePendingCommands.push(['smove', coin + ':blocksPending', coin + ':blocksConfirmed', r.serialized]);
                            if (!r.soloMined) {
                                roundsToDelete.push(coin + ':shares:round' + r.height);
                            }
                            return;
                    }
                });

                var finalRedisCommands = [];

                if (movePendingCommands.length > 0)
                    finalRedisCommands = finalRedisCommands.concat(movePendingCommands);

                if (orphanMergeCommands.length > 0)
                    finalRedisCommands = finalRedisCommands.concat(orphanMergeCommands);

                if (immatureUpdateCommands.length > 0)
                    finalRedisCommands = finalRedisCommands.concat(immatureUpdateCommands);

                if (balanceUpdateCommands.length > 0)
                    finalRedisCommands = finalRedisCommands.concat(balanceUpdateCommands);

                if (workerPayoutsCommand.length > 0)
                    finalRedisCommands = finalRedisCommands.concat(workerPayoutsCommand);

                if (roundsToDelete.length > 0)
                    finalRedisCommands.push(['del'].concat(roundsToDelete));

                if (confirmsUpdate.length > 0)
                    finalRedisCommands = finalRedisCommands.concat(confirmsUpdate);

                if (confirmsToDelete.length > 0)
                    finalRedisCommands = finalRedisCommands.concat(confirmsToDelete);

                if (paymentsUpdate.length > 0)
                    finalRedisCommands = finalRedisCommands.concat(paymentsUpdate);

                if (totalPaid !== 0)
                    finalRedisCommands.push(['hincrbyfloat', coin + ':stats', 'totalPaid', totalPaid]);

                if (finalRedisCommands.length === 0) {
                    callback();
                    return;
                }

                startRedisTimer();
                redisClient.multi(finalRedisCommands).exec(function (error, results) {
                    endRedisTimer();
                    if (error) {
                        clearInterval(paymentInterval);
                        logger.error(logSystem, logComponent,
                            'Payments sent but could not update redis. ' + JSON.stringify(error)
                            + ' Disabling payment processing to prevent possible double-payouts. The redis commands in '
                            + coin + '_finalRedisCommands.txt must be ran manually');
                        fs.writeFile(coin + '_finalRedisCommands.txt', JSON.stringify(finalRedisCommands), function (err) {
                            logger.error('Could not write finalRedisCommands.txt, you are fucked.');
                        });
                    }
                    callback();
                });
            }

        ], function () {


            var paymentProcessTime = Date.now() - startPaymentProcess;
            logger.debug(logSystem, logComponent, 'Finished interval - time spent: '
                + paymentProcessTime + 'ms total, ' + timeSpentRedis + 'ms redis, '
                + timeSpentRPC + 'ms daemon RPC');

        });
    };


    this.handleStake = function(stakeData) {
        var redisCommands = [];

        var dateNow = Date.now();

        if (stakeData.confirmations < poolConfig.requiredStakeConfirmations) {
            redisCommands.push(['sadd', coin + ':stakesPendingConfirms', [stakeData.blockHash, stakeData.txHash, stakeData.height, stakeData.stakeholder, dateNow / 1000 | 0].join(':')]);
        } else {
            
        if (!shareData.isSoloMining) {
            if (isValidShare) {
                redisCommands.push(['hincrbyfloat', coin + ':shares:roundCurrent', shareData.worker, shareData.difficulty]);
                redisCommands.push(['hincrby', coin + ':stats', 'validShares', 1]);
            } else {
                redisCommands.push(['hincrby', coin + ':stats', 'invalidShares', 1]);
            }
        }

        /* Stores share diff, worker, and unique value with a score that is the timestamp. Unique value ensures it
           doesn't overwrite an existing entry, and timestamp as score lets us query shares from last X minutes to
           generate hashrate for each worker and pool. */
        var dateNow = Date.now();
        var hashrateData = [ isValidShare ? shareData.difficulty : -shareData.difficulty, shareData.worker, dateNow, shareData.isSoloMining ? 'SOLO' : 'PROP'];
        redisCommands.push(['zadd', coin + ':hashrate', dateNow / 1000 | 0, hashrateData.join(':')]);

        if (isValidBlock){
            if (!shareData.isSoloMining) {
                redisCommands.push(['rename', coin + ':shares:roundCurrent', coin + ':shares:round' + shareData.height]);
            }
            redisCommands.push(['sadd', coin + ':blocksPending', [shareData.blockHash, shareData.txHash, shareData.height, shareData.worker, dateNow / 1000 | 0, shareData.isSoloMining ? 'SOLO' : 'PROP'].join(':')]);
            redisCommands.push(['hincrby', coin + ':stats', 'validBlocks', 1]);
        }
        else if (shareData.blockHash){
            redisCommands.push(['hincrby', coin + ':stats', 'invalidBlocks', 1]);
        }

        connection.multi(redisCommands).exec(function(err, replies){
            if (err)
                logger.error(logSystem, logComponent, logSubCat, 'Error with share processor multi ' + JSON.stringify(err));
        });
    };

};
