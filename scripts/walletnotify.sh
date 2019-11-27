#!/bin/bash

NOMP_COIN=$1
shift

NOMP_HASH=$1
shift

NOMP_HOST=127.0.0.1:17117

#echo "WalletNotify: $NOMP_HOST $NOMP_COIN $NOMP_HASH" >> /var/log/crypto-pool.walletnotify.log

case $NOMP_COIN in
	veruscoin)
		/opt/cryptocurrency/nomp/scripts/walletnotify $NOMP_HOST $NOMP_COIN $NOMP_HASH
		;;
esac

exit 0
