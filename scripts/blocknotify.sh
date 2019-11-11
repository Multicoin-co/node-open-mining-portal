#!/bin/bash

NOMP_COIN=$1
shift

NOMP_HASH=$1
shift

NOMP_HOST=127.0.0.1:17117

#echo "BlockNotify: $NOMP_HOST $NOMP_COIN $NOMP_HASH" >> /var/log/crypto-pool.blocknotify.log

case $NOMP_COIN in
	bitcoin|dash|dogecoin|horizen|litecoin|lucent|raven|stronghands|vertcoin|veruscoin|zero)
		/opt/cryptocurrency/nomp/scripts/blocknotify $NOMP_HOST $NOMP_COIN $NOMP_HASH
		;;
	bitcoincash)
		/opt/cryptocurrency/nomp/scripts/blocknotify $NOMP_HOST 'bitcoin cash' $NOMP_HASH
		;;
	bitcoinrebooted)
		/opt/cryptocurrency/nomp/scripts/blocknotify $NOMP_HOST 'bitcoin rebooted' $NOMP_HASH
		;;
	bitcoinsv)
		/opt/cryptocurrency/nomp/scripts/blocknotify $NOMP_HOST 'bitcoin sv' $NOMP_HASH
		;;
	bitcoinv)
		/opt/cryptocurrency/nomp/scripts/blocknotify $NOMP_HOST 'bitcoin v' $NOMP_HASH
		;;
	litecoincash)
		/opt/cryptocurrency/nomp/scripts/blocknotify $NOMP_HOST 'litecoin cash' $NOMP_HASH
		;;
	digibyte)
		/opt/cryptocurrency/nomp/scripts/blocknotify $NOMP_HOST 'digibyte - odo' $NOMP_HASH
		/opt/cryptocurrency/nomp/scripts/blocknotify $NOMP_HOST 'digibyte - qubit' $NOMP_HASH
		/opt/cryptocurrency/nomp/scripts/blocknotify $NOMP_HOST 'digibyte - scrypt' $NOMP_HASH
		/opt/cryptocurrency/nomp/scripts/blocknotify $NOMP_HOST 'digibyte - sha256' $NOMP_HASH
		/opt/cryptocurrency/nomp/scripts/blocknotify $NOMP_HOST 'digibyte - skein' $NOMP_HASH
		;;
	verge)
		/opt/cryptocurrency/nomp/scripts/blocknotify $NOMP_HOST 'verge - groestl' $NOMP_HASH
		/opt/cryptocurrency/nomp/scripts/blocknotify $NOMP_HOST 'verge - blake' $NOMP_HASH
		/opt/cryptocurrency/nomp/scripts/blocknotify $NOMP_HOST 'verge - scrypt' $NOMP_HASH
		/opt/cryptocurrency/nomp/scripts/blocknotify $NOMP_HOST 'verge - x17' $NOMP_HASH
		/opt/cryptocurrency/nomp/scripts/blocknotify $NOMP_HOST 'verge - lyra2re2' $NOMP_HASH
		;;
	auroracoin)
		/opt/cryptocurrency/nomp/scripts/blocknotify $NOMP_HOST 'auroracoin - groestl' $NOMP_HASH
		/opt/cryptocurrency/nomp/scripts/blocknotify $NOMP_HOST 'auroracoin - qubit' $NOMP_HASH
		/opt/cryptocurrency/nomp/scripts/blocknotify $NOMP_HOST 'auroracoin - scrypt' $NOMP_HASH
		/opt/cryptocurrency/nomp/scripts/blocknotify $NOMP_HOST 'auroracoin - sha256' $NOMP_HASH
		/opt/cryptocurrency/nomp/scripts/blocknotify $NOMP_HOST 'auroracoin - skein' $NOMP_HASH
		;;
esac

exit 0
