if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('Botkit');
var os = require('os');
var PairingService = require('./service/pairingService');
var CommonUtils = require('./utils/commonUtils');

var controller = Botkit.slackbot({
    debug: false
});

var bot = controller.spawn({
    token: process.env.token,
    retry: 5
}).startRTM();

var pairingService = new PairingService();
var commonUtils = new CommonUtils();

controller.on('rtm_open',function(bot) {
  console.log('** The RTM api just connected! **');
});

controller.on('rtm_close',function(bot) {
  console.log('** The RTM api just closed **');
});

controller.hears(['hello', 'hi'], 'direct_message,direct_mention,mention', function (bot, message) {
    bot.reply(message, 'hi');
});

controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
    'direct_message,direct_mention,mention', function (bot, message) {

        var hostname = os.hostname();
        var uptime = commonUtils.formatTime(process.uptime());

        bot.reply(message,
            ':robot_face: I am a bot named <@' + bot.identity.name +
            '>. I have been running for ' + uptime + ' on ' + hostname + '.');

    });

controller.hears(['pairing stats'], 'direct_message,direct_mention,mention', function (bot, message) {
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
    if (gitMessageRegex.test(message.text)) {
        pairingService.processCommitFrom(message);
    }
});

controller.hears(['(.*) pushed to branch (.*)\|Compare changes\>(.*)'], ['ambient'], function (bot, message) {
    pairingService.processCommitFrom(message);
});