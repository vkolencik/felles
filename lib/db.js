const loki = require('lokijs');
var db;
var classes;
var users;

exports.initDb = function(dbFile) {
    return new Promise(function (resolve, reject) {
        db = new loki('db.json', {
            autoload: true,
            autosave: false, // saved manually in custom methods
            autoloadCallback: function() {
                classes = db.getCollection('classes') || db.addCollection('classes');
                users = db.getCollection('users') || db.addCollection('users');
                resolve();
            }
        });
    });
};

exports.getClass = function(branch, year, type) {
    let classData = {
        classBranch: branch,
        classYear: year,
        classEducationType: type
    };

    return classes.findOne(classData) || classes.insert(classData);
};

exports.saveClass = function(classData) {
    classes.update(classData);
    db.saveDatabase();
};