if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Store = require("jfs");
var db = new Store("data");
var FuzzyMatching = require('fuzzy-matching');
 
var personList = null;
 
var pairingStore = {};

db.get('pairingStore', function (err, data) {
    if (err) {
        console.log('Store retrieve failed');
        return;
    }
    pairingStore = data;
    personList = new FuzzyMatching(Object.keys(data));
});

var Botkit = require('Botkit');
var os = require('os');

var controller = Botkit.slackbot({
    debug: false
});

var bot = controller.spawn({
    token: process.env.token
}).startRTM();

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
        let pairStateMessage = (pair.split(',').length > 1)? 'paired' : 'worked solo'
        pairingStats.push(`:small_red_triangle: *${pair}* ${pairStateMessage} *${pairInfo.count} day(s)* ` +
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

const isAlreadyUpdatedForCurrentDay = (pairInfo) => {
    let today = new Date().toDateString();
    let lastUpdatedDate = new Date(pairInfo.timeStamp).toDateString();
    return lastUpdatedDate === today;
}

const getPairNames = (commitMessage, commitPusher) => {
    let regexForNamesWithinSquareBraces = '\\[([a-zA-Z]*)(?:\/)?([a-zA-Z]*)\\].*$';
    let regexForNamesWithColon = '([a-zA-Z]*)(?:\/)?([a-zA-Z]*)\\s?:.*$';
    let regexForNamesWithHyphen = '([a-zA-Z]*)(?:\/)?([a-zA-Z]*).?\\-\\s.*$';
    let regexText = new RegExp(`${regexForNamesWithinSquareBraces}|${regexForNamesWithColon}|${regexForNamesWithHyphen}`);

    let match = regexText.exec(commitMessage)
    if (match) {
        match.shift();
        let pair = match.filter(name => !!name).map(name => name.toLowerCase().trim());
        return pair;
    }
    return [commitPusher.toLowerCase().trim()];
}

const processCommitWith = (bot, message) => {
    let commitHashRegex = /\|\b[0-9a-f]{8}\b>:/gm;
    let match;
    let matchFound = false;
    while (match = commitHashRegex.exec(message.attachments[0].text)) {
        let commitIndex = match.index + 11;
        let commitRawStrings = message.attachments[0].text.substring(commitIndex).split('\n');
        let commitMessage = commitRawStrings[0].trim();
        let commitPusherRaw = commitRawStrings[1].split('-');
        let commitPusher = commitPusherRaw.pop();
        let pair = getPairNames(commitMessage, commitPusher);
        let pairInfo = (pair.length > 1)? pairingStore[pair.toString()] || pairingStore[`${pair[1]},${pair[0]}`]
                                        : pairingStore[pair.toString()];
        updatePairInfo(pair, pairInfo);
        matchFound = true;
    }

    if (matchFound) {
        saveCurrentStatToStore();
    }
}

const updatePairInfo = (pair, pairInfo) => {
    if (pairInfo) {
        if (!isAlreadyUpdatedForCurrentDay(pairInfo))
            pairInfo.count += 1;
    } else {
        let fuzzyResult = [
                            personList.get(pair.toString(), { maxChanges: 4 }),
                            personList.get(`${pair[1]},${pair[0]}`, { maxChanges: 4 })
        ];
        let nearestNameMatch = fuzzyResult.reduce((prev, current) => (prev.distance > current.distance) ? prev : current);
        pairInfo = pairingStore[nearestNameMatch.value || pair.toString()] = {
            count: 1,
            timeStamp: new Date().getTime()
        }
        personList = new FuzzyMatching(Object.keys(pairingStore));
    }
    return pairInfo;
}

const saveCurrentStatToStore = () => {
    db.save('pairingStore', pairingStore, function (err) {
        if (err) {
            console.log('Store update failed');
        }
    });
}

const formatUptime = (uptime) => {
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