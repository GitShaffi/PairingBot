const cron = require('cron');
const Time = require('time-js');

class NotificationService {
    constructor(notificationStore, pairingService, notificationCallback) {
        this._notificationStore = notificationStore;
        this._pairingService = pairingService;
        this._notificationCallback = notificationCallback;
        this._notificationsConfig = new Map([
                                                ['pairing stats', this._pairingService.getPairingStatsMessage.bind(this._pairingService)],
                                                ['missing stats', this._pairingService.getMissingStatsMessage.bind(this._pairingService)]
                                    ]);
        this._crons = {};
        this._initializeSubscribeNotifications();
    }

    isValidNotification(notificationName) {
        return [...this._notificationsConfig.keys()].includes(notificationName);
    }

    subscribe(name, time, channel) {
        if(this._crons[name])
            return false;
        
        this._notificationStore.updateNotification(name, time.toString(), channel);
        this._createCronJob(name, time, channel);
        return true
    }

    unSubscribe(name) {
        const existingJob = this._crons[name];
        
        if(existingJob) {
            existingJob.stop();
            delete this._crons[name];
            this._notificationStore.removeNotification(name);
            return true;
        }

        return false;
    }

    _createCronJob(name, time, channel) {
        const cronTime = `00 ${time.minutes()} ${(time.period() === 'pm')? time.hours()+12 : time.hours()} * * *`;
        const job = new cron.CronJob({
            cronTime,
            onTick: () => this._sendNotification(name, channel),
            start: true
        });
        this._crons[name] = job;
    }

    _sendNotification(name, channel) {
        const notificationMessage = this._notificationsConfig.get(name);
        this._notificationCallback({channel, text: `@here Your notification for \`${name}\`.`});
        this._notificationCallback(Object.assign({channel}, notificationMessage()));
    }

    _initializeSubscribeNotifications() {
        this._notificationStore
            .getNotifications()
            .forEach(notification => this._createCronJob(notification.name, Time(notification.time), notification.channel));
    }
}

module.exports = NotificationService;