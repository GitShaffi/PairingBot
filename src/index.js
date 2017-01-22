if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Store = require("jfs");
var db = new Store("data");

var pairingStore = {};

db.get('pairingStore', function (err, data) {
    if (err) {
        console.log('Store retrieve failed');
        return;
    }
    pairingStore = data;
});

var Botkit = require('Botkit');
var os = require('os');

var controller = Botkit.slackbot({
    debug: false
});

var bot = controller.spawn({
    token: process.env.token
}).startRTM();

controller.hears(['hello', 'hi'], 'direct_message,direct_mention,mention', function (bot, message) {
    bot.reply(message, 'hi');
});

controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
    'direct_message,direct_mention,mention', function (bot, message) {

        var hostname = os.hostname();
        var uptime = formatUptime(process.uptime());

        bot.reply(message,
            ':robot_face: I am a bot named <@' + bot.identity.name +
            '>. I have been running for ' + uptime + ' on ' + hostname + '.');

    });

controller.hears(['pairing stats'], 'direct_message,direct_mention,mention', function (bot, message) {
    let pairs = Object.keys(pairingStore);

    if (!pairs.length) {
        bot.reply(message, 'Sorry, no stats available currently! :disappointed:');
        return;
    }

    let pairingStats = [];
    pairs.forEach((pair) => {
        let pairInfo = pairingStore[pair];
        pairingStats.push(`:small_red_triangle: *${pair}* paired *${pairInfo.count} day(s)* ` +
            `as of ${new Date(pairInfo.timeStamp).toDateString()}`);
    });

    bot.reply(
        message,
        pairingStats.join('\n')
    );
});

controller.on('bot_message', function (bot, message) {
    let gitMessageRegex = /(.*) pushed to branch (.*)\|Compare changes\>(.*)/;
    if (gitMessageRegex.test(message.text)) {
        processCommitWith(bot, message);
    }
});

controller.hears(['(.*) pushed to branch (.*)\|Compare changes\>(.*)'], ['ambient'], function (bot, message) {
    processCommitWith(bot, message);
});

let isAlreadyUpdatedForCurrentDay = (pairInfo) => {
    let today = new Date().toDateString();
    let lastUpdatedDate = new Date(pairInfo.timeStamp).toDateString();
    return lastUpdatedDate === today;
}

let getPairNames = (commitMessage) => {
    var regexText = /\[([\w]*)(?:\/)?([\w]*)\].*$/;
    let match = regexText.exec(commitMessage)
    return [match[1].toLowerCase().trim(), match[2].toLowerCase().trim()];
}

let processCommitWith = (bot, message) => {
    let commitHashRegex = /\|\b[0-9a-f]{8}\b>:/gm;
    let match;
    let matchFound = false;
    
    while (match = commitHashRegex.exec(message.attachments[0].text)) {
        let commitIndex = match.index + 11;
        let commitRawString = message.attachments[0].text.substring(commitIndex);
        let commitMessage = (commitRawString.split('\n')[0]).trim();
        let pair = getPairNames(commitMessage);
        let pairInfo = pairingStore[pair.toString()] || pairingStore[`${pair[1]},${pair[0]}`];
        updatePairInfo(pair, pairInfo);
        matchFound = true;
    }

    if (matchFound) {
        saveCurrentStatToStore();
    }
}

let updatePairInfo = (pair, pairInfo) => {
    if (pairInfo) {
        if (!isAlreadyUpdatedForCurrentDay(pairInfo))
            pairInfo.count += 1;
    } else {
        pairInfo = pairingStore[pair.toString()] = {
            count: 1,
            timeStamp: new Date().getTime()
        }
    }
    return pairInfo;
}

let saveCurrentStatToStore = () => {
    db.save('pairingStore', pairingStore, function (err) {
        if (err) {
            console.log('Store update failed');
        }
    });
}

let formatUptime = (uptime) => {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}