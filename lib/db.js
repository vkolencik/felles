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

exports.getBranches = function() {
    return classes.mapReduce(cl => cl.classBranch, vals => vals.filter(onlyUnique))
};

exports.getYears = function() {
    return classes.mapReduce(cl => cl.classYear, vals => vals.filter(onlyUnique))
};

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

exports.getUser = function(psid) {
    return users.findOne({ psid: psid}) || users.insert({ psid: psid});
};

exports.saveUser = function(user) {
    users.update(user);
    db.saveDatabase();
};

exports.saveUserBranch = function(psid, branch) {
    let user = exports.getUser(psid);
    user.branch = branch;
    exports.saveUser(user);
};

exports.saveUserYear = function(psid, year) {
    let user = exports.getUser(psid);
    user.year = year;
    exports.saveUser(user);
};

exports.saveUserEducationType = function(psid, educationType) {
    let user = exports.getUser(psid);
    user.educationType = educationType;
    exports.saveUser(user);
};

exports.getAllUsers = function() {
    return users.find({});
};

exports.getAllClasses = function() {
    return classes.find({});
};

exports.getUsersByClass = function(classData) {
    return users.find({
        branch: classData.classBranch,
        year: classData.classYear,
        educationType: classData.classEducationType
    });
};