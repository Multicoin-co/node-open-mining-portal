# Cryptocurrency Pool Server <img src="https://cryptopools.aod-tech.com/static/logo.png" width="64" alt="Cryptocurrency Pool Server Logo" valign="middle">

[![NPM](https://nodei.co/npm/cryptocurrency-pool-server.png?downloads=true&stars=true)](https://nodei.co/npm/cryptocurrency-pool-server/)

This software is an extremely efficient, highly scalable, all-in-one, easy to setup cryptocurrency mining/staking pool written
entirely in Node.js. It contains a stratum poolserver; reward/payment/share processor; and a responsive user-friendly front-end
website featuring mining/staking instructions and in-depth live statistics.

#### Production Usage Notice
This is beta software. All of the following are things that can change and break an existing server setup: functionality of any feature, structure of configuration files and structure of redis data.
If you use this software in production then *DO NOT* pull new code straight into production usage because it can and often will break your setup and require you to tweak things like config files or redis data.

#### Setting up Vertcoin
The same setup instructions apply as for other coins, with the exception that your verthash.dat must live inside the node-open-mining-portal folder.
If you have trouble with dependencies, please cd into node_modules/<module causing an issue> and run npm install for each one
 
- Donation addresses:
* BTC: 3BvKanhQwU8C2ZR1y42DHQEKC5yT1X5zjW
* DASH: XiY5o2Zw9vfxxBD7nbNpKgfpLCCewoHWWG
* DOGE: DL8bJPzn5i3tH6YdN3eV6ZFuHGc7UMUR3D
* LTC: MMyUZLuvvNHocpqLZwqAik4rVWY1KSVFKc
* VTC: 3ChMeULCfCSSmUQKTAvTujjb4DZn2MKKD7
* ETH: 0x03203fcb30774703d684FD3Ec5A4f9De39C8f907
* ETC: 0x62A12D574167d37713294fB82D9157aC511F264a
* DGB: Sb5Q8RwQWLi9e2Cjxs8inaDw9RzKTKeEs1
 
#### Paid Solution
I offer a paid-setup solution on fiver. Click here to [View](https://www.fiverr.com/ahmedbodi/setup-a-cryptocurrency-mining-pool)

**Coin switching & auto-exchanging for payouts in BTC/LTC** to miners is a feature that very likely will not be included in this project. 

#### Table of Contents
* [Features](#features)
  * [Attack Mitigation](#attack-mitigation)
  * [Security](#security)
* [Community Support](#community--support)
* [Usage](#usage)
  * [Requirements](#requirements)
  * [Setting Up Coin Daemon](#0-setting-up-coin-daemon)
  * [Downloading & Installing](#1-downloading--installing)
  * [Configuration](#2-configuration)
    * [Portal Config](#portal-config)
    * [Coin Config](#coin-config)
    * [Pool Config](#pool-config)
    * [Setting Up Blocknotify](#optional-recommended-setting-up-blocknotify)
  * [Starting the Server](#3-start-the-server)
  * [Upgrading](#upgrading)
* [Donations](#donations)
* [Credits](#credits)
* [License](#license)

### Features

* For the pool server it uses the highly efficient [cryptocurrency-stratum-pool](//github.com/AoD-Technologies/cryptocurrency-stratum-pool) module which
supports vardiff, PoW, PoS, transaction messages, anti-DDoS, IP banning, and [many hashing algorithms](//github.com/AoD-Technologies/cryptocurrency-stratum-pool#hashing-algorithms-supported).

* The portal has an [MPOS](//github.com/MPOS/php-mpos) compatibility mode so that it can
function as a drop-in-replacement for [python-stratum-mining](//github.com/Crypto-Expert/stratum-mining). This
mode can be enabled in the configuration and will insert shares into a MySQL database in the format which MPOS expects.

* Multi-pool ability - this software was built from the ground up to run with multiple coins simultaneously (which can
have different properties and hashing algorithms). It can be used to create a pool for a single coin or for multiple
coins at once. The pools use clustering to load balance across multiple CPU cores.

* For reward/payment processing, shares are inserted into Redis (a fast NoSQL key/value store). The PROP (proportional)
reward system is used with [Redis Transactions](https://redis.io/topics/transactions) for secure and super speedy payouts.
There is zero risk to the pool operator. Shares from rounds resulting in orphaned blocks will be merged into shares for the
current round so that each and every share will be rewarded.

* This portal does not have user accounts/logins/registrations. Instead, miners simply use their coin address for stratum
authentication.

* Coin-switching ports using coin-networks and crypto-exchange APIs to detect profitability. Miner's connect to these ports
with their public key which the server uses to derive an address for any coin needed to be paid out.

#### Attack Mitigation
* Detects and thwarts socket flooding (garbage data sent over socket in order to consume system resources).
* Detects and thwarts zombie miners (botnet infected computers connecting to your server to use up sockets but not sending any shares).
* Detects and thwarts invalid share attacks:
   * Cryptocurrency Pool Server is not vulnerable to the low difficulty share exploits happening to other pool servers. Other pool server
   software has hardcoded guesstimated max difficulties for new hashing algorithms while this software dynamically generates the
   max difficulty for each algorithm based on values founds in coin source code.
   * IP banning feature which on a configurable threshold will ban an IP for a configurable amount of time if the miner
   submits over a configurable threshold of invalid shares.
* This software is written in Node.js which uses a single thread (async) to handle connections rather than the overhead of one
thread per connection, and clustering is also implemented so all CPU cores are taken advantage of.

#### Security
Cryptocurrency Pool Server has some implicit security advantages for pool operators and miners:
* Without a registration/login system, non-security-oriented miners reusing passwords across pools is no longer a concern.
* Automated payouts by default and pool profits are sent to another address so pool wallets aren't plump with coins -
giving hackers little reward and keeping your pool from being a target.
* Miners can notice lack of automated payments as a possible early warning sign that an operator is about to run off with their coins.

### Community / Support
Discord
* Support / general discussion join [#cryptopools-github](https://discordapp.com/invite/XpQmBjz)

*Having problems getting the portal running due to some module dependency error?* It's probably because you
didn't follow the instructions in this README. Please __read the usage instructions__ including [requirements](#requirements) and [downloading/installing](#1-downloading--installing). If you've followed the instructions completely and are still having problems then open an issue here on github or join our #cryptopools-github Discord channel and explain your problem :).

If your pool uses Cryptocurrency Pool Server let us know and we will list your website here.

##### Some pools using this software:
* https://cryptopools.aod-tech.com

Usage
=====

#### Requirements
* Coin daemon(s) (find the coin's repo and build latest version from source)
* [Node.js](https://nodejs.org/) v12.10.3+ ([follow these installation instructions](//github.com/joyent/node/wiki/Installing-Node.js-via-package-manager))
* [Redis](https://redis.io/) key-value store v2.6+ ([follow these instructions](https://redis.io/topics/quickstart))
* You may need to install libgmp3-dev through your OS package manager if you run into build issues with multi-hashing.

##### Seriously
Those are legitimate requirements. If you use old versions of Node.js or Redis that may come with your system package manager then you will have problems. Follow the linked instructions to get the last stable versions.

[**Redis security warning**](https://redis.io/topics/security): be sure firewall access to redis - an easy way is to
include `bind 127.0.0.1` in your `redis.conf` file. Also it's a good idea to learn about and understand software that
you are using - a good place to start with redis is [data persistence](https://redis.io/topics/persistence).

#### 0) Setting up coin daemon
Follow the build/install instructions for your coin daemon. Your coin.conf file should end up looking something like this:
```
daemon=1
rpcuser=litecoinrpc
rpcpassword=securepassword
rpcport=19332
```
For redundancy, its recommended to have at least two daemon instances running in case one drops out-of-sync or offline,
all instances will be polled for block/transaction updates and be used for submitting blocks. Creating a backup daemon
involves spawning a daemon using the `-datadir=/backup` command-line argument which creates a new daemon instance with
it's own config directory and coin.conf file. Learn about the daemon, how to use it and how it works if you want to be
a good pool operator. For starters be sure to read:
   * https://en.bitcoin.it/wiki/Running_bitcoind
   * https://en.bitcoin.it/wiki/Data_directory
   * https://en.bitcoin.it/wiki/Original_Bitcoin_client/API_Calls_list
   * https://en.bitcoin.it/wiki/Difficulty

#### 1) Downloading & Installing

Clone the repository and run `npm install` for all the dependencies to be installed:

```bash
git clone https://github.com/AoD-Technologies/cryptocurrency-pool-server.git
cd cryptocurrency-pool-server
npm install
```

#### 2) Configuration

##### Portal config
Inside the `config_example.json` file, ensure the default configuration will work for your environment, then copy the file to `config.json`.

Explanation for each field:
````javascript
{
    /* Specifies the level of log output verbosity. Anything more severe than the level specified
       will also be logged. */
    "logLevel": "debug", //or "warning", "error"
    
    /* By default the server logs to console and gives pretty colors. If you direct that output to a
       log file then disable this feature to avoid nasty characters in your log file. */
    "logColors": true, 


    /* The server CLI (command-line interface) will listen for commands on this port. For example,
       blocknotify messages are sent to the server through this. */
    "cliPort": 17117,

    /* By default 'forks' is set to "auto" which will spawn one process/fork/worker for each CPU
       core in your system. Each of these workers will run a separate instance of your pool(s),
       and the kernel will load balance miners using these forks. Optionally, the 'forks' field
       can be a number for how many forks will be spawned. */
    "clustering": {
        "enabled": true,
        "forks": "auto"
    },
    
    /* Pool config file will inherit these default values if they are not set. */
    "defaultPoolConfigs": {
    
        /* Poll RPC daemons for new blocks every this many milliseconds. */
        "blockRefreshInterval": 1000,
        
        /* If no new blocks are available for this many seconds update and rebroadcast job. */
        "jobRebroadcastTimeout": 55,
        
        /* Disconnect workers that haven't submitted shares for this many seconds. */
        "connectionTimeout": 600,
        
        /* (For MPOS mode) Store the block hashes for shares that aren't block candidates. */
        "emitInvalidBlockHashes": false,
        
        /* This option will only authenticate miners using an address or mining key. */
        "validateWorkerUsername": true,
        
        /* Enable for client IP addresses to be detected when using a load balancer with TCP
           proxy protocol enabled, such as HAProxy with 'send-proxy' param:
           http://haproxy.1wt.eu/download/1.5/doc/configuration.txt */
        "tcpProxyProtocol": false,
        
        /* If under low-diff share attack we can ban their IP to reduce system/network load. If
           running behind HAProxy be sure to enable 'tcpProxyProtocol', otherwise you'll end up
           banning your own IP address (and therefore all workers). */
        "banning": {
            "enabled": true,
            "time": 600, //How many seconds to ban worker for
            "invalidPercent": 50, //What percent of invalid shares triggers ban
            "checkThreshold": 500, //Perform check when this many shares have been submitted
            "purgeInterval": 300 //Every this many seconds clear out the list of old bans
        },
        
        /* Used for storing share and block submission data and payment processing. */
        "redis": {
            "host": "127.0.0.1",
            "port": 6379
        }
    },

    /* This is the front-end. Its not finished. When it is finished, this comment will say so. */
    "website": {
        "enabled": true,
        /* If you are using a reverse-proxy like nginx to display the website then set this to
           127.0.0.1 to not expose the port. */
        "host": "0.0.0.0",
        "port": 80,
        /* Used for displaying stratum connection data on the Getting Started page. */
        "stratumHost": "cryppit.com",
        "stats": {
            /* Gather stats to broadcast to page viewers and store in redis for historical stats
               every this many seconds. */
            "updateInterval": 15,
            /* How many seconds to hold onto historical stats. Currently set to 24 hours. */
            "historicalRetention": 43200,
            /* How many seconds worth of shares should be gathered to generate hashrate. */
            "hashrateWindow": 300
        },
        /* Not done yet. */
        "adminCenter": {
            "enabled": true,
            "password": "password"
        }
    },

    /* Redis instance of where to store global portal data such as historical stats, proxy states,
       ect.. */
    "redis": {
        "host": "127.0.0.1",
        "port": 6379
    },


    /* With this switching configuration, you can setup ports that accept miners for work based on
       a specific algorithm instead of a specific coin. Miners that connect to these ports are
       automatically switched a coin determined by the server. The default coin is the first
       configured pool for each algorithm and coin switching can be triggered using the
       cli.js script in the scripts folder.

       Miners connecting to these switching ports must use their public key in the format of
       RIPEMD160(SHA256(public-key)). An address for each type of coin is derived from the miner's
       public key, and payments are sent to that address. */
    "switching": {
        "switch1": {
            "enabled": false,
            "algorithm": "sha256",
            "ports": {
                "3333": {
                    "diff": 10,
                    "varDiff": {
                        "minDiff": 16,
                        "maxDiff": 512,
                        "targetTime": 15,
                        "retargetTime": 90,
                        "variancePercent": 30
                    }
                }
            }
        },
        "switch2": {
            "enabled": false,
            "algorithm": "scrypt",
            "ports": {
                "4444": {
                    "diff": 10,
                    "varDiff": {
                        "minDiff": 16,
                        "maxDiff": 512,
                        "targetTime": 15,
                        "retargetTime": 90,
                        "variancePercent": 30
                    }
                }
            }
        },
        "switch3": {
            "enabled": false,
            "algorithm": "x11",
            "ports": {
                "5555": {
                    "diff": 0.001
                }
            }
        }
    },

    "profitSwitch": {
        "enabled": false,
        "updateInterval": 600,
        "depth": 0.90,
        "usePoloniex": true,
        "useCryptsy": true,
        "useMintpal": true
    }
}
````


##### Coin config
Inside the `coins` directory, ensure a json file exists for your coin. If it does not you will have to create it.
Here is an example of the required fields:
````javascript
{
    "name": "Litecoin",
    "symbol": "ltc",
    "algorithm": "scrypt",

    // Coinbase value is what is added to a block when it is mined, set this to your pool name so 
    // explorers can see which pool mined a particular block.
    "coinbase": "Kryptonite",
    /* Magic value only required for setting up p2p block notifications. It is found in the daemon
       source code as the pchMessageStart variable.
       For example, litecoin mainnet magic: http://git.io/Bi8YFw
       And for litecoin testnet magic: http://git.io/NXBYJA */
    "peerMagic": "fbc0b6db", //optional
    "peerMagicTestnet": "fcc1b7dc" //optional

    //"txMessages": false, //options - defaults to false

    //"mposDiffMultiplier": 256, //options - only for x11 coins in mpos mode
}
````

For additional documentation how to configure coins and their different algorithms
see [these instructions](//github.com/AoD-Technologies/cryptocurrency-stratum-pool#module-usage).


##### Pool config
Take a look at the example json file inside the `pool_configs` directory. Rename it to `yourcoin.json` and change the
example fields to fit your setup.

Description of options:

````javascript
{
    "enabled": true, //Set this to false and a pool will not be created from this config file
    "coin": "litecoin.json", //Reference to coin config file in 'coins' directory

    "address": "mi4iBXbBsydtcc5yFmsff2zCFVX4XG7qJc", //Address to where block rewards are given

    /* Block rewards go to the configured pool wallet address to later be paid out to miners,
       except for a percentage that can go to, for examples, pool operator(s) as pool fees or
       or to donations address. Addresses or hashed public keys can be used. Here is an example
       of rewards going to the main pool op and a pool co-owner. */
    "rewardRecipients": {
        "n37vuNFkXfk15uFnGoVyHZ6PYQxppD3QqK": 1.5, //1.5% goes to pool op
        "mirj3LtZxbSTharhtXvotqtJXUY7ki5qfx": 0.5 //0.5% goes to a pool co-owner
    },

    "paymentProcessing": {
        "enabled": true,

        /* Every this many seconds get submitted blocks from redis, use daemon RPC to check
           their confirmation status, if confirmed then get shares from redis that contributed
           to block and send out payments. */
        "paymentInterval": 30,

        /* Minimum number of coins that a miner must earn before sending payment. Typically,
           a higher minimum means less transactions fees (you profit more) but miners see
           payments less frequently (they dislike). Opposite for a lower minimum payment. */
        "minimumPayment": 0.01,

        /* This daemon is used to send out payments. It MUST be for the daemon that owns the
           configured 'address' that receives the block rewards, otherwise the daemon will not
           be able to confirm blocks or send out payments. */
        "daemon": {
            "host": "127.0.0.1",
            "port": 19332,
            "user": "testuser",
            "password": "testpass"
        }
    },

    /* Each pool can have as many ports for your miners to connect to as you wish. Each port can
       be configured to use its own pool difficulty and variable difficulty settings. varDiff is
       optional and will only be used for the ports you configure it for. */
    "ports": {
        "3032": { //A port for your miners to connect to
            "diff": 32, //the pool difficulty for this port

            /* Variable difficulty is a feature that will automatically adjust difficulty for
               individual miners based on their hashrate in order to lower networking overhead */
            "varDiff": {
                "minDiff": 8, //Minimum difficulty
                "maxDiff": 512, //Network difficulty will be used if it is lower than this
                "targetTime": 15, //Try to get 1 share per this many seconds
                "retargetTime": 90, //Check to see if we should retarget every this many seconds
                "variancePercent": 30 //Allow time to very this % from target without retargeting
            }
        },
        "3256": { //Another port for your miners to connect to, this port does not use varDiff
            "diff": 256 //The pool difficulty
        }
    },

    /* More than one daemon instances can be setup in case one drops out-of-sync or dies. */
    "daemons": [
        {   //Main daemon instance
            "host": "127.0.0.1",
            "port": 19332,
            "user": "testuser",
            "password": "testpass"
        }
    ],

    /* This allows the pool to connect to the daemon as a node peer to receive block updates.
       It may be the most efficient way to get block updates (faster than polling, less
       intensive than blocknotify script). It requires the additional field "peerMagic" in
       the coin config. */
    "p2p": {
        "enabled": false,

        /* Host for daemon */
        "host": "127.0.0.1",

        /* Port configured for daemon (this is the actual peer port not RPC port) */
        "port": 19333,

        /* If your coin daemon is new enough (i.e. not a shitcoin) then it will support a p2p
           feature that prevents the daemon from spamming our peer node with unnecessary
           transaction data. Assume its supported but if you have problems try disabling it. */
        "disableTransactions": true
    },
    
    /* Enabled this mode and shares will be inserted into in a MySQL database. You may also want
       to use the "emitInvalidBlockHashes" option below if you require it. The config options
       "redis" and "paymentProcessing" will be ignored/unused if this is enabled. */
    "mposMode": {
        "enabled": false,
        "host": "127.0.0.1", //MySQL db host
        "port": 3306, //MySQL db port
        "user": "me", //MySQL db user
        "password": "mypass", //MySQL db password
        "database": "ltc", //MySQL db database name

        /* Checks for valid password in database when miners connect. */
        "checkPassword": true,

        /* Unregistered workers can automatically be registered (added to database) on stratum
           worker authentication if this is true. */
        "autoCreateWorker": false
    }
}

````

You can create as many of these pool config files as you want (such as one pool per coin you which to operate).
If you are creating multiple pools, ensure that they have unique stratum ports.

For more information on these configuration options see the [pool module documentation](https://github.com/AoD-Technologies/cryptocurrency-stratum-pool#module-usage)


##### [Optional, recommended] Setting up blocknotify
1. In `config.json` set the port and password for `blockNotifyListener`
2. In your daemon conf file set the `blocknotify` command to use:
```
node [path to cli.js] [coin name in config] [block hash symbol]
```
Example: inside `dogecoin.conf` add the line
```
blocknotify=node /opt/cryptocurrency-pool-server/scripts/cli.js blocknotify dogecoin %s
```

Alternatively, you can use a more efficient block notify script written in pure C. Build and usage instructions
are commented in [scripts/blocknotify.c](scripts/blocknotify.c).


#### 3) Start the portal

```bash
node init.js
```

###### Optional enhancements for your awesome new mining pool server setup:
* Use something like [forever](//github.com/nodejitsu/forever) to keep the node script running
in case the master process crashes. 
* Use something like [redis-commander](//github.com/joeferner/redis-commander) to have a nice GUI
for exploring your redis database.
* Use something like [logrotator](https://www.thegeekstuff.com/2010/07/logrotate-examples/) to rotate log 
output.
* Use [New Relic](https://newrelic.com/) to monitor your server performance.


#### Upgrading
When updating Cryptocurrency Pool Server to the latest version it's important to not only `git pull` the latest from this repo, but to also update
the `cryptocurrency-stratum-pool` and `node-multi-hashing` modules, and any config files that may have been changed.
* Inside your server directory (where the init.js script is) do `git pull` to get the latest code.
* Remove the dependenices by deleting the `node_modules` directory with `rm -r node_modules`.
* Run `npm install` to force updating/reinstalling of the dependencies.
* Compare your `config.json` and `pool_configs/coin.json` configurations to the latest example ones in this repo or the ones in the setup instructions where each config field is explained. You may need to modify or add any new changes.

Credits
-------
* [Invader444](//github.com/Invader444) - lead developer
* [The NOMP developers](//github.com/zone117x/node-stratum-pool#credits)
* [Numski] Vertcoinpool.com operator

License
-------
Released under the GNU General Public License v3

https://www.gnu.org/licenses/gpl-3.0.html
