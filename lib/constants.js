const dataUrl = 'http://www.skolamedea.cz/studenti/zmeny-v-rozvrhu-2/';

module.exports = Object.freeze({
    CLASS_DATA_URL: dataUrl,
    BOT_PROFILE:
        {
            "target_audience": {
            "audience_type": "none" // don't show up in bot discovery
        },
            "greeting": [{
            "locale":"default",
            "text":"Ahoj!"
        }],
            "get_started": { "payload" : "getStartedPostback" },
            "persistent_menu": [
            {
                "locale": "default",
                "composer_input_disabled": true,
                "call_to_actions": [
                    {
                        "title": "Znovu zadat údaje",
                        "type": "postback",
                        "payload": "getStartedPostback"
                    },
                    {
                        "type": "web_url",
                        "title": "Stránka se změnami rozvrhu",
                        "url": dataUrl,
                        "webview_height_ratio": "full"
                    },
                    {
                        "title": "Odhlásit se",
                        "type": "postback",
                        "payload": "unsubscribe"
                    }
                ]
            }
        ]
    },
    classDataSnapshotsDir: 'snapshots'
});