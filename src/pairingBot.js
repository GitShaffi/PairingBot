const Botkit = require('Botkit');
const os = require('os');
const Time = require('time-js');
const PairingService = require('./service/pairingService');
const NotificationService = require('./service/notificationService');
const CommonUtils = require('./utils/commonUtils');
const PairingStore = require('./store/pairingStore');
const PeopleStore = require('./store/peopleStore')
const NotificationStore = require('./store/notificationStore')
const Server = require('./server.js')

class PairingBot {
    constructor() {

        if (!process.env.token) {
            console.log('Error: Specify token in environment');
            process.exit(1);
        }

        this._botController = null;
        this._bot = null;
        this.sendMessage = this.sendMessage.bind(this);
        this._listMembers = this._listMembers.bind(this);
        this._setMemberCount = this._setMemberCount.bind(this);
        this._processMemberAddition = this._processMemberAddition.bind(this);
        this._processMemberRemoval = this._processMemberRemoval.bind(this);
        this._addSolo = this._addSolo.bind(this);
        this._addPair = this._addPair.bind(this);
        this._respondWithUptime = this._respondWithUptime.bind(this);
        this._processNotification = this._processNotification.bind(this);
        this._deactivateNotification = this._deactivateNotification.bind(this);
        this._help = this._help.bind(this);
        this._peopleStore = new PeopleStore();
        this._pairingStore = new PairingStore();
        this._notificationStore = new NotificationStore();
        this._pairingService = new PairingService(this._peopleStore, this._pairingStore);
        this._notificationService = new NotificationService(this._notificationStore, this._pairingService, this.sendMessage);
        this._uiServer = new Server();
    }

    start() {
        this._botController = Botkit.slackbot({ debug: false });

        this._bot = this._botController
                        .spawn({ token: process.env.token, retry: 5 })
                        .startRTM();

        this._setupBotController();

        // this._uiServer.start();
    }

    sendMessage(message) {
        this._bot.say(message);
    }

    _setupBotController() {
        this._botController.on('rtm_open', (bot) => {
            console.log('** The RTM api just connected! **');
        });

        this._botController.on('rtm_close', (bot) => {
            console.log('** The RTM api just closed **');
        });

        this._botController.hears([/\bhello\b/i, /\bhi\b/i], 'direct_message,direct_mention', (bot, message) => {
            bot.reply(message, 'hello');
        });

        this._botController.on('bot_channel_join', (bot, message) => {
            bot.reply(message, 'Hurray! Here I am! :robot_face:');
            this._isTeamConfigured(bot, message);
        });

        this._botController.hears([/list members/i], 'direct_message,direct_mention', this._listMembers);

        this._botController.hears([/set member count ([0-9]*)/i], 'direct_message,direct_mention', this._setMemberCount);

        this._botController.hears([/add member ([a-zA-Z]*)/i], 'direct_message,direct_mention', this._processMemberAddition);

        this._botController.hears([/remove member ([a-zA-Z]*)/i], 'direct_message,direct_mention', this._processMemberRemoval);

        this._botController.hears([/add solo ([a-zA-Z]*)/i], 'direct_message,direct_mention', this._addSolo);

        this._botController.hears([/add pair ([a-zA-Z]*)(?:,\s?)([a-zA-Z]*)/i], 'direct_message,direct_mention', this._addPair);

        this._botController.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
            'direct_message,direct_mention', this._respondWithUptime);

        this._botController.hears([/^notify ([a-zA-Z\s]*) at (.*)/i], 'direct_message,direct_mention', this._processNotification);

        this._botController.hears([/^deactivate ([a-zA-Z\s]*) notification/i], 'direct_message,direct_mention', this._deactivateNotification);

        this._botController.hears([/pairing stats/i], 'direct_message,direct_mention', (bot, message) => {
            bot.reply(message, this._pairingService.getPairingStatsMessage());
            bot.reply(message, this._uiServer.getStatsUrl());
        });

        this._botController.hears([/missing stats/i], 'direct_message,direct_mention', (bot, message) => {
            if (this._isTeamConfigured(bot, message)) {
                bot.reply(message, this._pairingService.getMissingStatsMessage());
            }
        });

        this._botController.hears([/^(bye|see you later|tata|ciao|adieu)/i], ['direct_message,direct_mention'], (bot, message) => {
            bot.reply(message, 'Thanks. Have a good time! :wave:');
        });

        this._botController.hears([/^help/i], ['direct_message,direct_mention'], this._help);

        this._botController.on('bot_message', (bot, message) => {
            let gitMessageRegex = /(.*) pushed to branch (.*)\|Compare changes\>(.*)/;
            if (this._isTeamConfigured(bot, message) && gitMessageRegex.test(message.text)) {
                this._pairingService.processCommitFrom(message);
            }
        });

        this._botController.hears(['.*'], ['direct_message,direct_mention'], (bot, message) => {
            bot.reply(message, 'Sorry, I don\'t have any matching conversation for that.\n'
                                    + 'Message with \`help\` to see list of supported conversations.');
        });
    }

    _setMemberCount(bot, message) {
        let count = message.match[1];
        let response = this._peopleStore.setExpectedMemberCount(count) ? 
                            `Cool! I have set the member count to ${count} :thumbsup:` : 'You are not allowed to set invalid count.'
        bot.reply(message, response);
    }

    _processMemberAddition(bot, message) {
        let personName = message.match[1];
        if(this._peopleStore.addMember(personName)) {
            bot.reply(message, `Added ${personName.toLowerCase().trim()} to list! :thumbsup:`);
            return;
        }
        bot.reply(message, 'Member already exist! :confused:');
    }

    _processMemberRemoval(bot, message) {
        let personName = message.match[1];
        if (!this._peopleStore.removeMember(personName)) {
            bot.reply(message, 'Member doesn\'t exist! :confused:');
            return;
        }
        
        bot.startConversation(message, (err, convo) => {
            convo.ask(`Removed ${personName.toLowerCase().trim()} from list! :thumbsup:\nYour team had ${this._peopleStore.getExpectedMemberCount()} members before. Would you like to reduce it by 1?`,
                        [{
                            pattern: bot.utterances.yes,
                            callback: (response, convo) => {
                                this._peopleStore.setExpectedMemberCount(this._peopleStore.getExpectedMemberCount() - 1);
                                convo.next();
                            }
                        }, {
                            pattern: bot.utterances.no,
                            callback: (response, convo) => {
                                convo.stop();
                            }
                        }, {
                            default: true,
                            callback: (response, convo) => {
                                convo.repeat();
                                convo.next();
                            }
                        }
            ]);

            convo.on('end', (convo) => {
                if (convo.status == 'completed') {
                    bot.reply(message, 'OK! I will update my dossier! :thumbsup:');
                } else {
                    bot.reply(message, 'I cannot track pairing untill the team list is complete!'
                                        + ' You can `add member` or `set team count` to resume tracking anytime.');
                }
            });
        });
    }

    _addSolo(bot, message) {
        if(this._isTeamConfigured(bot, message)) {
            let pairName = message.match[1];
            if(this._pairingService.addPair([pairName])) {
                bot.reply(message, `Oh! we have a lone wolf today!\nHave updated ${pairName} to the stats :thumbsup:`);
                return;
            }
            bot.reply(message, `Unable to identify \`${pairName}\` in the team :white_frowning_face:`);
        }
    }

    _addPair(bot, message) {
        if(this._isTeamConfigured(bot, message)){
            let pair = [message.match[1], message.match[2]];
            if(this._pairingService.addPair(pair)) {
                bot.reply(message, `Added ${pair[0]} and ${pair[1]} to today's stats :thumbsup:`);
                return;
            }
            bot.reply(message, `Unable to identify \`${pair.join(' / ')}\` in the team :white_frowning_face:`);
        }
    }

    _respondWithUptime(bot, message) {
        const hostname = os.hostname();
        const uptime = CommonUtils.formatTime(process.uptime());

        bot.reply(message,
            ':robot_face: I am a bot named <@' + bot.identity.name +
            '>. I have been running for ' + uptime + ' on ' + hostname + '.');
    }

    _processNotification(bot, message) {
        const notificationName = message.match[1].trim().toLowerCase();
        if(!this._notificationService.isValidNotification(notificationName)){
            bot.reply(message, 'Sorry, the notification type specified is invalid.\nReply with \`help\` to see list of supported messages.');
            return;
        }

        const time = Time(message.match[2].trim());
        if(!time.isValid()){
            bot.reply(message, 'Sorry, the time specified is invalid.\nReply with \`help\` to see list of supported messages.');
            return;
        }
        if(!this._notificationService.subscribe(notificationName, time, message.channel)){
            bot.reply(message, 'You have already subscribed for the notification.\nIf you intend to update, deactivate existing notification and try again.');
            return;
        }

        bot.reply(message, `Cool! You will be notified with \`${notificationName}\` at ${time.toString()} everyday.\
        \nYou can deactivate it anytime with the message \`deactivate ${notificationName} notification\`.`);
    }
    
    _deactivateNotification(bot, message) {
        const notificationName = message.match[1].trim().toLowerCase();
        if(!this._notificationService.isValidNotification(notificationName)){
            bot.reply(message, 'Sorry, the notification type specified is invalid.\nReply with \`help\` to see list of supported messages.');
            return;
        }
        
        if(!this._notificationService.unSubscribe(notificationName)){
            bot.reply(message, `You do not have \`${notificationName}\` in your existing subscription.`);
            return;
        }

        bot.reply(message, `You have been unsubscribed from \`${notificationName}\` notification.`);
    }

    _help(bot, message) {
        const response = "Once you invite me to the commit channel, I start listening to git webhook.\n \
        Acceptable commit message samples\n\
                • `[StoryCardNumber] [Person1/Person2] commit message description`\n\
                • `[StoryCardNumber] [Person1|Person2] commit message description`\n\
                • `[StoryCardNumber] [Person1] commit message description`\n\
                • `[Person1/Person2] commit message description`\n\
                • `Person1/Person2: commit message description`\n\
                • `Person1/Person2 - commit message description`\n\
        Below are the few messages to which I can respond: \n\
                • `hello, hi` \n\
                • `list members` \n\
                • `set member count <count>` \n\
                • `add member <name>` \n\
                • `remove member <name>` \n\
                • `add solo <name>` \n\
                • `add pair <name1,name2>` \n\
                • `pairing stats` \n\
                • `missing stats` \n\
                • `notify pairing stats at <time>` \n\
                • `notify missing stats at <time>` \n\
                • `deactivate pairing stats notification` \n\
                • `deactivate missing stats notification` \n\
                • `uptime, who are you?, what is your name?, identify yourself` \n\
                • `bye, see you later, tata, ciao, adieu`\n \
     Accepted time formats: (`hh:mm`/`h`/`h.mm`/`hpm`/`h:mm a`/`h:mm a`/`h.mm am`/`h.mm A`/`hh:mm a.m.`/`h:mma`)";

        bot.reply(message, response);
    }

    _listMembers(bot, message) {
        if(this._peopleStore.getMemberList().length === 0) {
            bot.reply(message, 'No members added yet! :neutral_face:');
            return;
        }

        let members = this._peopleStore.getMemberList().map((member) => `:small_red_triangle: ${member}`).join('\n');
        let memberCountStatus = `Members in team: (*${this._peopleStore.getMemberList().length}/${this._peopleStore.getExpectedMemberCount()}*)\n`
        bot.reply(message, memberCountStatus + members);
    }

    _isTeamConfigured(bot, message) {
        if(!this._peopleStore.getExpectedMemberCount()) {
            bot.reply(message, 'Team not yet configured.'
                + ' Set expected team member count with `set member count <count>`,'
                + ' and start creating your team with `add member <member-name>`.');
            return false;
        }

        if(this._peopleStore.getMemberList().length !== this._peopleStore.getExpectedMemberCount()) {
            bot.reply(message, `(*${this._peopleStore.getMemberList().length}/${this._peopleStore.getExpectedMemberCount()}*)`
                    + ' members added. Please complete the list to start tracking.'
            );
            return false;
        }

        return true;
    }
}

module.exports = PairingBot;