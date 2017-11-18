const loki = require('lokijs');
const db = new loki('db.json');
var classes = db.addCollection('classes');
var users = db.addCollection('users');

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