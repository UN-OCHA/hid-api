var db = connect("localhost:27017/local");
db.getCollectionNames().forEach(coll => { 
  if (coll.indexOf("system.") === -1){
    db[coll].drop(); 
  }
});
