if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('Botkit');
var os = require('os');
var PairingService = require('./service/pairingService');
var CommonUtils = require('./utils/commonUtils');
var PeopleStore = require('./store/peopleStore')

var controller = Botkit.slackbot({
    debug: false
});

var bot = controller.spawn({
    token: process.env.token,
    retry: 5
}).startRTM();

var pairingService = new PairingService();
var commonUtils = new CommonUtils();
var peopleStore = new PeopleStore();

controller.on('rtm_open',function(bot) {
  console.log('** The RTM api just connected! **');
});

controller.on('rtm_close',function(bot) {
  console.log('** The RTM api just closed **');
});

controller.hears([/\bhello\b/i, /\bhi\b/i], 'direct_message,direct_mention,mention', function (bot, message) {
    bot.reply(message, 'hello');
});

controller.on('bot_channel_join', function(bot, message) {
    bot.reply(message, 'Hurray! Here I am! :robot_face:');
    isTeamConfigured(bot, message);
});

controller.hears([/list members/i], 'direct_message,direct_mention,mention', function (bot, message) {
    if(peopleStore.getMemberList().length === 0) {
        bot.reply(message, 'No members added yet! :neutral_face:');
        return;
    }

    let members = peopleStore.getMemberList().map((member) => `:small_red_triangle: ${member}`).join('\n');
    let memberCountStatus = `Members in team: (*${peopleStore.getMemberList().length}/${peopleStore.getExpectedMemberCount()}*)\n`
    bot.reply(message, memberCountStatus + members);
});

controller.hears([/set member count ([0-9]*)/i], 'direct_message,direct_mention,mention', function (bot, message) {
    let response = peopleStore.setExpectedMemberCount(message.match[1]) ? 
                        'Done :thumbsup:' : 'You are not allowed to set invalid count.'
    bot.reply(message, response);
});

controller.hears([/add member ([a-zA-Z]*)/i], 'direct_message,direct_mention,mention', function (bot, message) {
    bot.reply(message, peopleStore.addMember(message.match[1]));
});

controller.hears([/add solo ([a-zA-Z]*)/i], 'direct_message,direct_mention,mention', function (bot, message) {
    pairingService.addPair([message.match[1]]);
    bot.reply(message, 'Done :thumbsup:');
});

controller.hears([/add pair ([a-zA-Z]*)(?:,\s?)([a-zA-Z]*)/i], 'direct_message,direct_mention,mention', function (bot, message) {
    pairingService.addPair([match[1], match[2]]);
    bot.reply(message, 'Done :thumbsup:');
});

controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
    'direct_message,direct_mention,mention', function (bot, message) {

        var hostname = os.hostname();
        var uptime = commonUtils.formatTime(process.uptime());

        bot.reply(message,
            ':robot_face: I am a bot named <@' + bot.identity.name +
            '>. I have been running for ' + uptime + ' on ' + hostname + '.');

    });

controller.hears([/pairing stats/i], 'direct_message,direct_mention,mention', function (bot, message) {
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