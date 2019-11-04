var redis = require('redis');
var async = require('async');

var stats = require('./stats.js');

module.exports = function(logger, portalConfig, poolConfigs){
    var _this = this;

    var portalStats = this.stats = new stats(logger, portalConfig, poolConfigs);

    this.liveStatConnections = {};

    this.handleApiRequest = function(req, res, next){
        switch(req.params.method){
            case 'stats':
                res.set('Content-Type', 'application/json');
                res.set('X-Robots-Tag', 'none');
                res.end(portalStats.statsString);
                return;
            case 'pool_stats':
                res.set('Content-Type', 'application/json');
                res.set('X-Robots-Tag', 'none');
                res.end(JSON.stringify(portalStats.statPoolHistory));
                return;
            case 'blocks':
            case 'getblocksstats':
                portalStats.getBlocks(function(data){
                    res.header('Content-Type', 'application/json');
                    res.set('X-Robots-Tag', 'none');
                    res.end(JSON.stringify(data));
                });
                break;
            case 'payments':
                var poolBlocks = [];
                for(var pool in portalStats.stats.pools) {
                    poolBlocks.push({name: pool, pending: portalStats.stats.pools[pool].pending, payments: portalStats.stats.pools[pool].payments});
                }
                res.header('Content-Type', 'application/json');
                res.set('X-Robots-Tag', 'none');
                res.end(JSON.stringify(poolBlocks));
                return;
            case 'worker_stats':
                res.header('Content-Type', 'application/json');
                res.set('X-Robots-Tag', 'none');
                if (req.url.indexOf("?")>0) {
                    var url_parms = req.url.split("?");
                    if (url_parms.length > 0) {
                        var history = {};
                        var workers = {};
                        var address = url_parms[1] || null;
                        if (address != null && address.length > 0) {
                            // make sure it is just the miners address
                            address = address.split(".")[0];
                            // get miners balance along with worker balances
                            portalStats.getBalanceByAddress(address, function(balances) {
                                // get current round share total
                                portalStats.getTotalSharesByAddress(address, function(shares) {
                                    var totalHash = parseFloat(0.0);
                                    var totalSoloHash = parseFloat(0.0);
                                    var totalShares = shares;
                                    var networkSols = 0;
                                    for (var h in portalStats.statHistory) {
                                        for(var pool in portalStats.statHistory[h].pools) {
                                            for(var w in portalStats.statHistory[h].pools[pool].workers){
                                                if (w.startsWith(address)) {
                                                    if (history[w] == null) {
                                                        history[w] = [];
                                                    }

                                                    var entry = {
                                                        time: portalStats.statHistory[h].time
                                                    };
                                                    
                                                    if (portalStats.statHistory[h].pools[pool].workers[w].hashrate) {
                                                        entry.hashrate = portalStats.statHistory[h].pools[pool].workers[w].hashrate;
                                                    }

                                                    if (portalStats.statHistory[h].pools[pool].workers[w].solohashrate) {
                                                        entry.solohashrate = portalStats.statHistory[h].pools[pool].workers[w].solohashrate;
                                                    }

                                                    if (Object.keys(entry).length > 1) {
                                                        history[w].push(entry);
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    for(var pool in portalStats.stats.pools) {
                                        for(var w in portalStats.stats.pools[pool].workers){
                                            if (w.startsWith(address)) {
                                                workers[w] = portalStats.stats.pools[pool].workers[w];
                                                for (var b in balances.balances) {
                                                    if (w == balances.balances[b].worker) {
                                                        workers[w].paid = balances.balances[b].paid;
                                                        workers[w].balance = balances.balances[b].balance;
                                                    }
                                                }
                                                workers[w].balance = (workers[w].balance || 0);
                                                workers[w].paid = (workers[w].paid || 0);
                                                totalHash += portalStats.stats.pools[pool].workers[w].hashrate;
                                                totalSoloHash += portalStats.stats.pools[pool].workers[w].solohashrate;
                                                networkSols = portalStats.stats.pools[pool].poolStats.networkSols;
                                            }
                                        }
                                    }
                                    res.end(JSON.stringify({miner: address, totalHash: totalHash, totalSoloHash: totalSoloHash, totalShares: totalShares, networkSols: networkSols, immature: balances.totalImmature, balance: balances.totalHeld, paid: balances.totalPaid, workers: workers, history: history}));
                                });
                            });
                        } else {
                            res.end(JSON.stringify({result: "error"}));
                        }
                    } else {
                        res.end(JSON.stringify({result: "error"}));
                    }
                } else {
                    res.end(JSON.stringify({result: "error"}));
                }
                return;
            case 'live_stats':
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'X-Robots-Tag': 'none'
                });
                res.write('\n');
                var uid = Math.random().toString();
                _this.liveStatConnections[uid] = res;
                res.flush();
                req.on("close", function() {
                    delete _this.liveStatConnections[uid];
                });
                return;
            default:
                next();
        }
    };

    this.handleAdminApiRequest = function(req, res, next){
        switch(req.params.method){
            case 'pools': {
                res.end(JSON.stringify({result: poolConfigs}));
                return;
            }
            default:
                next();
        }
    };
};
