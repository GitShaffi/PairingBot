if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('Botkit');
var os = require('os');
var PairingService = require('./service/pairingService');
var CommonUtils = require('./utils/commonUtils');
var PairingStore = require('./store/pairingStore');
var PeopleStore = require('./store/peopleStore')

var controller = Botkit.slackbot({
    debug: false
});

var bot = controller.spawn({
    token: process.env.token,
    retry: 5
}).startRTM();

var peopleStore = new PeopleStore();
var pairingStore = new PairingStore();
var pairingService = new PairingService(peopleStore, pairingStore);
var commonUtils = new CommonUtils();

controller.on('rtm_open',function(bot) {
  console.log('** The RTM api just connected! **');
});

controller.on('rtm_close',function(bot) {
  console.log('** The RTM api just closed **');
});

controller.hears([/\bhello\b/i, /\bhi\b/i], 'direct_message,direct_mention', function (bot, message) {
    bot.reply(message, 'hello');
});

controller.on('bot_channel_join', function(bot, message) {
    bot.reply(message, 'Hurray! Here I am! :robot_face:');
    isTeamConfigured(bot, message);
});

controller.hears([/list members/i], 'direct_message,direct_mention', function (bot, message) {
    if(peopleStore.getMemberList().length === 0) {
        bot.reply(message, 'No members added yet! :neutral_face:');
        return;
    }

    let members = peopleStore.getMemberList().map((member) => `:small_red_triangle: ${member}`).join('\n');
    let memberCountStatus = `Members in team: (*${peopleStore.getMemberList().length}/${peopleStore.getExpectedMemberCount()}*)\n`
    bot.reply(message, memberCountStatus + members);
});

controller.hears([/set member count ([0-9]*)/i], 'direct_message,direct_mention', function (bot, message) {
    let response = peopleStore.setExpectedMemberCount(message.match[1]) ? 
                        'Done :thumbsup:' : 'You are not allowed to set invalid count.'
    bot.reply(message, response);
});

controller.hears([/add member ([a-zA-Z]*)/i], 'direct_message,direct_mention', function (bot, message) {
    let personName = message.match[1];
    if(peopleStore.addMember(personName)) {
        bot.reply(message, `Added ${personName.toLowerCase().trim()} to list! :thumbsup:`);
        return;
    }
    bot.reply(message, 'Member already exist! :confused:');
});

controller.hears([/remove member ([a-zA-Z]*)/i], 'direct_message,direct_mention', function (bot, message) {
    let personName = message.match[1];
    if (!peopleStore.removeMember(personName)) {
        bot.reply(message, 'Member doesn\'t exist! :confused:');
        return;
    }
    
    bot.startConversation(message, function(err, convo) {
        convo.ask(`Removed ${personName.toLowerCase().trim()} from list! :thumbsup:\nYour team had ${peopleStore.getExpectedMemberCount()} members before. Would you like to reduce it by 1?`,
                    [{
                        pattern: bot.utterances.yes,
                        callback: function(response, convo) {
                            peopleStore.setExpectedMemberCount(peopleStore.getExpectedMemberCount() - 1);
                            convo.next();
                        }
                    }, {
                        pattern: bot.utterances.no,
                        callback: function(response, convo) {
                            convo.stop();
                        }
                    }, {
                        default: true,
                        callback: function(response, convo) {
                            convo.repeat();
                            convo.next();
                        }
                    }
        ]);

        convo.on('end', function(convo) {
            if (convo.status == 'completed') {
                bot.reply(message, 'OK! I will update my dossier! :thumbsup:');
            } else {
                bot.reply(message, 'I cannot track pairing untill the team list is complete!'
                                    + ' You can `add member` or `set team count` to resume tracking anytime.');
            }
        });
    });
});

controller.hears([/add solo ([a-zA-Z]*)/i], 'direct_message,direct_mention', function (bot, message) {
    let pairName = message.match[1];
    if(pairingService.addPair([pairName])) {
        bot.reply(message, 'Done :thumbsup:');
        return;
    }
    bot.reply(message, `Unable to identify ${pairName} in the team :white_frowning_face:`);
});

controller.hears([/add pair ([a-zA-Z]*)(?:,\s?)([a-zA-Z]*)/i], 'direct_message,direct_mention', function (bot, message) {
    let pair = [match[1], match[2]];
    if(pairingService.addPair(pair)) {
        bot.reply(message, 'Done :thumbsup:');
        return;
    }
    bot.reply(message, `Unable to identify ${pair.toString()} in the team :white_frowning_face:`);
});

controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
    'direct_message,direct_mention', function (bot, message) {

        var hostname = os.hostname();
        var uptime = commonUtils.formatTime(process.uptime());

        bot.reply(message,
            ':robot_face: I am a bot named <@' + bot.identity.name +
            '>. I have been running for ' + uptime + ' on ' + hostname + '.');

    });

controller.hears([/pairing stats/i], 'direct_message,direct_mention', function (bot, message) {
    let pairStats = pairingService.getPairingStats();
    
    if (!pairStats) {
        bot.reply(message, 'Sorry, no stats available currently! :disappointed:');
        return;
    }

    let pairingStatMessages = [];
    pairStats.map(pairStat => {
        const pairStateMessage = pairStat.getPair().isSolo()? 'worked solo' : 'paired';
        pairingStatMessages.push(`:small_red_triangle: *${pairStat.getPair()}* ${pairStateMessage} *${pairStat.getPairInfo().count} day(s)* `
                        + `as of ${new Date(pairStat.getPairInfo().timeStamp).toDateString()}`);
    })    

    bot.reply(message, pairingStatMessages.join('\n'));
});

controller.hears([/^(bye|see you later|tata|ciao|adieu)/i], ['direct_message,direct_mention'], function (bot, message) {
    bot.reply(message, 'Thanks. Have a good time! :wave:');
});


controller.on('bot_message', function (bot, message) {
    let gitMessageRegex = /(.*) pushed to branch (.*)\|Compare changes\>(.*)/;
    if (isTeamConfigured(bot, message) && gitMessageRegex.test(message.text)) {
        pairingService.processCommitFrom(message);
    }
});

controller.hears(['(.*) pushed to branch (.*)\|Compare changes\>(.*)'], ['ambient'], function (bot, message) {
    if(isTeamConfigured(bot, message))
        pairingService.processCommitFrom(message);
});

const isTeamConfigured = (bot, message) => {
    if(!peopleStore.getExpectedMemberCount()) {
        bot.reply(message, 'Team not yet configured.'
            + ' Set expected team member count with `set member count <count>`,'
            + ' and start creating your team with `add member <member-name>`.');
        return false;
    }

    if(peopleStore.getMemberList().length !== peopleStore.getExpectedMemberCount()) {
        bot.reply(message, `(*${peopleStore.getMemberList().length}/${peopleStore.getExpectedMemberCount()}*)`
                + ' member added. Please complete the list to start tracking.'
        );
    }

    return true;
}