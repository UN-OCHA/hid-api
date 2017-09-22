#!/bin/sh
if [ ! -d "tmp" ];
then echo "Creating tmp folder !"; 
mkdir
fi
cd tmp/
tar xvf ../dump_db.tar.gz
mongorestore -d local ./development/

