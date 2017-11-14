'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const loki = require('lokijs');

const app = express();
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const db = new loki('db.json',  {
    autoload: true,
    autoloadCallback : databaseInitialize,
    autosave: true,
    autosaveInterval: 4000
});

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));

// Process application/json
app.use(bodyParser.json());

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

setUpProfile();

// Creates the endpoint for our webhook 
app.post('/webhook', (req, res) => {

    let body = req.body;

    // Checks this is an event from a page subscription
    if (body.object === 'page') {

        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function(entry) {

            // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];
            console.log(webhook_event);

            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            console.log('Sender PSID: ' + sender_psid);

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
            console.log('WEBHOOK_VERIFIED');
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

    if (payload === "getStartedPostback") {
        callSendAPI(sender_psid, {"text": "Ahoj, já jsem Felles!"});

        let branches = [
            {name: 'Nutriční terapeut', code: 'NTD'},
            {name: 'Všeobecná sestra', code: 'VSD'},
            {name: 'Zdravotnický záchranář', code: 'ZZD'},
            {name: 'Zdravotnický záchranář', code: 'ZZD'}
        ];

        let response = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [{
                        "title": "Povíš mi, z jakého jsi oboru?",
                        "buttons": branches.map(b => ({
                            "type": "postback",
                            "title": b.name,
                            "payload": b.code
                        }))
                    }]
                }
            }
        };

        callSendAPI(sender_psid, response);
    }
}

function callSendAPI(sender_psid, response) {
    // Construct the message body
    let request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    };

    // Send the HTTP request to the Messenger Platform
    request({
        "uri": "https://graph.facebook.com/v2.6/me/messages",
        "qs": { "access_token": PAGE_ACCESS_TOKEN },
        "method": "POST",
        "json": request_body
    }, (err, res, body) => {
        if (!err) {
        console.log('message sent!')
    } else {
        console.error("Unable to send message:" + err);
    }
});
}

function setUpProfile() {
    let request_body = {
        "greeting": [{
            "locale":"default",
            "text":"Ahoj!"
        }],
        "get_started": { "payload" : "getStartedPostback" }
    };

    request({
        "uri": "https://graph.facebook.com/v2.6/me/messenger_profile",
        "qs": { "access_token": PAGE_ACCESS_TOKEN },
        "method": "POST",
        "json": request_body
    }, (err, res, body) => {
        if (!err) {
            console.log("Profile API set successfully")
        } else {
            console.error("Unable to access profile api:" + err);
        }
    });
}

function databaseInitialize() {

}