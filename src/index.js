if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

const Botkit = require('Botkit');
const os = require('os');
const randomColor = require('randomcolor');
const PairingService = require('./service/pairingService');
const CommonUtils = require('./utils/commonUtils');
const PairingStore = require('./store/pairingStore');
const PeopleStore = require('./store/peopleStore')

const controller = Botkit.slackbot({
    debug: false
});

const bot = controller.spawn({
    token: process.env.token,
    retry: 5
}).startRTM();

const peopleStore = new PeopleStore();
const pairingStore = new PairingStore();
const pairingService = new PairingService(peopleStore, pairingStore);
const commonUtils = new CommonUtils();

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
    let count = message.match[1];
    let response = peopleStore.setExpectedMemberCount(count) ? 
                        `Cool! I have set the member count to ${count} :thumbsup:` : 'You are not allowed to set invalid count.'
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
        bot.reply(message, `Oh! we have a lone wolf today!\nHave updated ${pairName} to the stats :thumbsup:`);
        return;
    }
    bot.reply(message, `Unable to identify ${pairName} in the team :white_frowning_face:`);
});

controller.hears([/add pair ([a-zA-Z]*)(?:,\s?)([a-zA-Z]*)/i], 'direct_message,direct_mention', function (bot, message) {
    let pair = [match[1], match[2]];
    if(pairingService.addPair(pair)) {
        bot.reply(message, `Added ${pair[0]} and ${pair[1]} to today's stats :thumbsup:`);
        return;
    }
    bot.reply(message, `Unable to identify ${pair.toString()} in the team :white_frowning_face:`);
});

controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
    'direct_message,direct_mention', function (bot, message) {

        const hostname = os.hostname();
        const uptime = commonUtils.formatTime(process.uptime());

        bot.reply(message,
            ':robot_face: I am a bot named <@' + bot.identity.name +
            '>. I have been running for ' + uptime + ' on ' + hostname + '.');

    });

controller.hears([/pairing stats/i], 'direct_message,direct_mention', function (bot, message) {
    if (!pairingService.getPairingStats()) {
        bot.reply(message, 'Sorry, no stats available currently! :disappointed:');
        return;
    }

    let attachments = getPairingStatsAsSlackFormattedMessage();

    bot.reply(message, {attachments});
});

controller.hears([/^(bye|see you later|tata|ciao|adieu)/i], ['direct_message,direct_mention'], function (bot, message) {
    bot.reply(message, 'Thanks. Have a good time! :wave:');
});

controller.hears([/^help/i], ['direct_message,direct_mention'], function (bot, message) {
    response = "Once you invite me to the commit channel, I start listening to git webhook.\n \
    Acceptable commit message samples\n\
            • `[StoryCardNumber] [Person1/Person2] commit message description`\n\
            • `[StoryCardNumber] [Person1] commit message description`\n\
            • `[Person1/Person2] commit message description`\n\
            • `[StoryCardNumber] Person1/Person2: commit message description`\n\
            • `[StoryCardNumber] Person1/Person2 - commit message description`\n\
    Below are the few messages to which I can respond: \n\
            • `hello, hi` \n\
            • `list members` \n\
            • `set member count <count>` \n\
            • `add member <name>` \n\
            • `remove member <name>` \n\
            • `add solo <name>` \n\
            • `add pair <name1,name2>` \n\
            • `pairing stats` \n\
            • `uptime, who are you?, what is your name?, identify yourself` \n\
            • `bye, see you later, tata, ciao, adieu`";

    bot.reply(message, response);
});

controller.on('bot_message', function (bot, message) {
    let gitMessageRegex = /(.*) pushed to branch (.*)\|Compare changes\>(.*)/;
    if (isTeamConfigured(bot, message) && gitMessageRegex.test(message.text)) {
        pairingService.processCommitFrom(message);
    }
});

controller.hears(['.*'], ['direct_message,direct_mention'], function (bot, message) {
    bot.reply(message, 'Sorry, I don\'t have any matching conversation for that.\n'
                            + 'Message with \`help\` to see list of supported conversations.');
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

const getPairingStatsAsSlackFormattedMessage = () => {
    let pairStats = pairingService.getPairingStats();
    let message = peopleStore.getMemberList().map(member => {
        let mostRecentUpdatedAt = 0;
        
        let fields = pairStats.filter(pairStat => pairStat.getPair().contains(member))
                          .map(pairStat => {
                                let otherPair = pairStat.getPair().getOtherPairOf(member);
                                let columnTitle = (!otherPair)? 'Worked Solo' : otherPair;
                                let pairedCount = `${pairStat.getPairInfo().count} day`;
                                
                                if (pairStat.getPairInfo().count > 1)
                                    pairedCount = `${pairedCount}s`;
                                
                                mostRecentUpdatedAt = Math.max(pairStat.getPairInfo().timeStamp, mostRecentUpdatedAt); 

                                return { title: columnTitle, value: pairedCount, short: true };
                            });
        
        if(!fields.length)
            return;
        
        let updatedAtInEpoch = mostRecentUpdatedAt/1000;
        
        return {
            fallback: "Attachments not supported in your app. Please contact slack support for help.",
            color: randomColor({luminosity: 'dark'}),
            pretext: '-----------------------------------------------------------------------------------',
            title: `Pairing stats for ${member.toUpperCase()}`,
            text: '---------------------------------------',
            footer: 'Last updated',
            ts: updatedAtInEpoch,
            fields
        }
    }).filter(attachment => !!attachment);

    return message;
}