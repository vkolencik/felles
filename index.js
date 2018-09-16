'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const schedule = require('node-schedule');
const fs = require('fs');

const dataParser = require('./lib/data_parser');
var db;
const consts = require('./lib/constants');
const logger = require('./lib/logger');
const app = express();
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const testInstance = process.env.NODE_ENV === 'development';

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));

// Process application/json
app.use(bodyParser.json());


function logClassDataHtml(body) {
    var now = new Date();
    var filename = consts.classDataSnapshotsDir + '/' + now.getFullYear() + '-' + (now.getMonth() + 1) + '-' +  now.getDate() + '-' + now.getHours() + now.getMinutes() + now.getSeconds();
    if (!fs.existsSync(consts.classDataSnapshotsDir)) {
        fs.mkdirSync(consts.classDataSnapshotsDir, 0o744);
    }

    fs.writeFile(filename, body, undefined, err => err && logger.error('Error saving html snapshot', err));
}

function processClassData(body) {
    logClassDataHtml(body);
    let classesData = dataParser.parseClassesHtml(body);
    classesData.forEach(classData => {
        let existingData = db.getClass(classData.classBranch, classData.classYear, classData.classEducationType);
        if (existingData.classDataHash !== classData.classDataHash) {
            //notify change
            logger.debug('Class data changed', JSON.stringify(classData));
            let usersToNotify = db.getUsersByClass(classData);
            logger.debug('Notifying users', usersToNotify);
            usersToNotify.forEach(u => sendNotificationMessage(u));
            existingData.classDataHash = classData.classDataHash;
            existingData.lastUpdated = new Date();
            db.saveClass(existingData);
        }
    });
}

function fetchData() {
    logger.info('Fetching class data...')
    if (testInstance) {
        fs.readFile( __dirname + '/sample_page.html', function (err, data) {
            if (err) {
                throw err;
            }
            processClassData(data);
        });
    } else {
        request(consts.CLASS_DATA_URL, function (error, response, body) {
            if (!error) {
                processClassData(body);
            } else {
                logger.error('Error getting class data from ' + consts.CLASS_DATA_URL, error)
            }
        });
    }
}

function setUpDataHook() {
    db = require('./lib/db');
    db.initDb('db.json').then(function() {
        schedule.scheduleJob('*/5 * * * *', fetchData); // every 5th minute
        fetchData();
        // Sets server port and logs message on success
        app.listen(process.env.PORT || 1337, () => logger.info('webhook is listening'));
    });
}

app.get('/createTestUser', (req, res) => {
    db.saveUserBranch(1, 'Zdravotnický záchranář');
    db.saveUserYear(1, 1);
    db.saveUserEducationType(1, 'D');
    res.status(200).send('OK');
});

app.get('/users', (req, res) => {
    res.status(200).send(db.getAllUsers());
});

app.get('/classes', (req, res) => {
    res.status(200).send(db.getAllClasses());
});

app.get('/years', (req, res) => {
    res.status(200).send(db.getYears());
});

// Creates the endpoint for our webhook
app.post('/webhook', (req, res) => {
    logger.debug('Webhook received message ' + req.body.object);
    logger.silly('Full received message:\n' + JSON.stringify(req.body) + '\n\n');
    let body = req.body;

    // Checks this is an event from a page subscription
    if (body.object === 'page') {

        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function(entry) {

            // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];
            logger.debug('Webhook event', webhook_event);

            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            logger.debug('Sender PSID: ' + sender_psid);

            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }
        });

        // Returns a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = "WPQ2lS7IHgsUO7KkiXVN";

    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            // Responds with the challenge token from the request
            logger.info('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
});

// Handles messages events
function handleMessage(sender_psid, received_message) {
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
    // Get the payload for the postback
    let payload = received_postback.payload;

    logger.debug("Received postback: " + payload);

    if (payload === "getStartedPostback") {
        callSendAPI(sender_psid, {"text": "Ahoj, já jsem Felles! Když mi řekneš co studuješ, tak tě na oplátku budu průběžně informovat o změnách rozvrhu."})
            .then(() =>
                callSendAPI(sender_psid, getSelectionMessage("Povíš mi, z jakého jsi oboru?", db.getBranches(), b => "response-branch-" + b)));
    } else if (payload === "unsubscribe") {
        db.deleteUser(sender_psid);
        callSendAPI(sender_psid, {text: "OK, už ti nebudu nic posílat. Těšilo mě, měj se ;)"});
    } else if (payload.startsWith("response-")) {
        let responseData = payload.match(/response-([^\-]+)-(.*)/);
        let responseTo = responseData[1];
        let responseValue = responseData[2];

        logger.silly(responseData);

        switch(responseTo) {
            case 'branch':
                logger.debug('Setting branch of ' + sender_psid + ' to ' + responseValue);
                db.saveUserBranch(sender_psid, responseValue);
                callSendAPI(sender_psid, getSelectionMessage("Cajk, a ročník?", db.getYears().sort().slice(0, 3).map(y => y.toString()), y => "response-year-" + y));
                break;
            case 'year':
                db.saveUserYear(sender_psid, parseInt(responseValue));
                callSendAPI(sender_psid, getSelectionMessage("A denní nebo kombinované studium?", ["Denní", "Kombinované"], t => "response-type-" + t.charAt(0)));
                break;
            case 'type':
                db.saveUserEducationType(sender_psid, responseValue);
                callSendAPI(sender_psid, {"text": "Super, jakmile se něco šustne tak se ozvu ;)"});
                break;
        }
    }
}

function getSelectionMessage(title, options, createPayload) {
    return {
        "attachment": {
        "type":
            "template",
            "payload": {
            "template_type": "generic",
                "elements": [{
                    "title": title,
                    "buttons": options.map(b => ({
                        "type": "postback",
                        "title": b,
                        "payload": createPayload(b)
                    }))
                }]
            }
        }
    };
}

function sendNotificationMessage(user) {
    let messageText = 'Pssst, na ' + consts.CLASS_DATA_URL + ' je něco nového pro ' + user.year + '. ročník ' + (user.educationType == 'D' ? 'denní' : 'kombinované') + ' formy oboru ' + user.branch + '. Pokud už nechceš dostávat tyhle zprávy tak vyber možnost "odhlásit se" v menu.';
    callSendAPI(user.psid, { text: messageText }, 'NON_PROMOTIONAL_SUBSCRIPTION');
}

function callSendAPI(psid, response, messageType) {
    logger.debug('Sending reply message to ' + psid)
    logger.silly('Full message body:\n' + JSON.stringify(response) + '\n\n');
    // Construct the message body
    let request_body = {
        "recipient": {
            "id": psid
        },
        "message": response,
        "messaging_type": messageType || 'RESPONSE'
    };

    // Send the HTTP request to the Messenger Platform
    return new Promise(function (resolve, reject) {
        request({
            "uri": "https://graph.facebook.com/v2.6/me/messages",
            "qs": { "access_token": PAGE_ACCESS_TOKEN },
            "method": "POST",
            "json": request_body
        }, (err, res, body) => {
            logger.silly('Server responded with code ' + res.statusCode + ':\n' + JSON.stringify(res.body))

            if (res.statusCode < 300 && !err) {
                logger.debug('Message response sent');
                resolve();
            } else {
                logger.error("Unable to send response message", err);
                reject(err);
            }
        });
    });
}

function setUpBotProfile() {
    removePersistentMenu().then(function() {
        let request_body = consts.BOT_PROFILE;

        logger.debug("Setting bot profile: ", JSON.stringify(request_body));

        request({
            "uri": "https://graph.facebook.com/v2.6/me/messenger_profile",
            "qs": { "access_token": PAGE_ACCESS_TOKEN },
            "method": "POST",
            "json": request_body
        }, (err, res, body) => {
            if (!err) {
                logger.debug("Profile API set", JSON.stringify(body));
            } else {
                logger.error("Unable to access profile api", err);
            }
        });
    })
}

function removePersistentMenu() {
    return new Promise(function (resolve, reject) {
        logger.debug('Removing menu...');
        request({
            url: 'https://graph.facebook.com/v2.6/me/thread_settings',
            qs: { access_token: PAGE_ACCESS_TOKEN },
            method: 'POST',
            json: {
                setting_type : "call_to_actions",
                thread_state : "existing_thread",
                call_to_actions:[ ]
            }

        }, function(error, response, body) {
            logger.silly('response', response);
            if (error) {
                logger.error('Error sending messages: ', error);
                reject(new Error(error));
            } else if (response.body.error) {
                logger.error('Error: ', response.body.error);
                reject(new Error(error));
            } else {
                logger.info('Menu removed successfully...');
                resolve();
            }
        });
    });
}

console.log('FELLES version ' + require('./package.json').version);
logger.info('Starting Felles...')
if (!testInstance) {
    setUpBotProfile();
}
setUpDataHook();
