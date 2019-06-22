#!/bin/bash

BASE_URL="https://cryptopools-aod--tech-com.cdn.ampproject.org"

for PATH in "" "/getting-started" "/stats" "/tbs" "/workers" "/api"; do
	NOW=$( /bin/date +'%s' )
	URL="/update-cache/c/s/cryptopools.aod-tech.com${PATH}?amp_action=flush&amp_ts=${NOW}"
	echo $URL | /usr/bin/openssl dgst -sha256 -sign private-key.pem > signature.bin
	echo $URL | /usr/bin/openssl dgst -sha256 -signature signature.bin -verify website/static/.well-known/amphtml/apikey.pub
	SIGNATURE=$( /bin/cat signature.bin | /usr/bin/base64 -w 0 | /bin/sed 's/+/-/g' | /bin/sed 's/\//_/g' | /bin/sed 's/=//g' )
	/usr/bin/curl -H "Accept-Encoding: gzip" -i "${BASE_URL}${URL}&amp_url_signature=${SIGNATURE}"
done
