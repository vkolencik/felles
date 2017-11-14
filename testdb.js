const loki = require('lokijs');
const db = new loki('db.json',  {
    autoload: true,
    autoloadCallback : databaseInitialize,
    autosave: true,
    autosaveInterval: 4000
});

function databaseInitialize() {
    var entries = db.getCollection("entries");
    if (entries === null) {
        entries = db.addCollection("entries");
    }

    entries.insert({c: 3});
    entries.insert({a: 1});
    entries.insert({b: 2});
    db.saveDatabase();
}

