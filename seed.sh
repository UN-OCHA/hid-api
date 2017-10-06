#!/bin/sh
cd /srv/www/
mongo drop_collections.js
if [ ! -d "tmp" ];
then echo "Creating tmp folder !"; 
mkdir tmp
fi
cd tmp/
tar xvf ../dump_db.tar.gz
mongorestore -d local ./development/

