const JsonFileStore = require('./jsonFileStore');

class NotificationStore extends JsonFileStore {

    constructor() {
        super();
        this._fileStoreName = 'notificationStore';
        this._notifications = [];
        this._initializeNotificationStore();
    }

    updateNotification(name, time, channel) {
        this._notifications.push({name, time, channel});
        this._saveChannelToJsonStore();
    }

    removeNotification(name, time, channel) {
        this._notifications.splice(this._notifications.findIndex(
                                            (notification) => notification.name === name
                                    ), 1);
        this._saveChannelToJsonStore();
    }

    getNotifications() {
        return this._notifications;
    }

    _saveChannelToJsonStore() {
        this.save(this._fileStoreName, this._notifications);
    }

    _initializeNotificationStore() {
        const data = this.getSyncData(this._fileStoreName);
        this._notifications = (data)? data : [];
    }
}

module.exports = NotificationStore;