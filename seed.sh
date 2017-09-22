#!/bin/sh
cd tmp/
tar xvf ../dump_db.tar.gz
mongorestore -d local ./development/

