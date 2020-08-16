if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

const Botkit = require('Botkit');
const os = require('os');

const controller = Botkit.slackbot({
    debug: true
});

const bot = controller.spawn({
    token: process.env.token
}).startRTM();

controller.hears('interactive', 'direct_message', function(bot, message) {

    bot.reply(message, {
        text: '<slack-action://test-bot/reminders/complete/123|Mark as complete>',
        attachments:[
            {
                title: 'Do you want to interact with my buttons?',
                callback_id: '123',
                attachment_type: 'default',
                actions: [
                    {
                        "name":"yes",
                        "text": "Yes",
                        "value": "yes",
                        "type": "button",
                    },
                    {
                        "name":"no",
                        "text": "No",
                        "value": "no",
                        "type": "button",
                    }
                ]
            }
        ]
    });
});

controller.on('interactive_message_callback', function(bot, message) {

    var ids = message.callback_id.split(/\-/);
    var user_id = ids[0];
    var item_id = ids[1];

    var reply = {
            text: 'Here is <@' + user_id + '>s list:',
            attachments: [],
        }

            reply.attachments.push({
                title: 'text *FLAGGED*',
                callback_id: user_id + '-' + 1,
                attachment_type: 'default',
                actions: [
                    {
                        "name":"flag",
                        "text": ":waving_black_flag: Flag",
                        "value": "flag",
                        "type": "button",
                    },
                    {
                       "text": "Delete",
                        "name": "delete",
                        "value": "delete",
                        "style": "danger",
                        "type": "button",
                        "confirm": {
                          "title": "Are you sure?",
                          "text": "This will do something!",
                          "ok_text": "Yes",
                          "dismiss_text": "No"
                        }
                    }
                ]
            })

        bot.replyInteractive(message, reply);

});

controller.hears(['hello'], 'direct_message,direct_mention,mention', function (bot, message) {

    responses = [{
        text: "Shaffi pushed to branch <https://gitlab.com/group/ui/commits/cherry-pick-2ca2f35e|cherry-pick-2ca2f35e> of <https://gitlab.com/group/ui|group/ui> (<https://gitlab.com/group/ui/compare/4bbb856294a610cfb73ce63bf382a77187fc9499...8e4216f63b495ad89192e56879a9a4c1ced7821a|Compare changes>)",
        "attachments": [
            {
                "fallback": "Required plain-text.",
                "color": "#36a64f",
                "text": "<http://google.com|4ee05317>: [MPC-452] [Shaffi] Fixing refresh on tab switch. Switching to Show/Hide iFrames on route change for tools tabs alone.\n-Shaffi",
            }
        ]
    }];
    let choice = Math.floor(Math.random() * 18);
    bot.reply(message, responses[17]);
});