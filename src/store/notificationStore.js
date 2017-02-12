const JsonFileStore = require('./jsonFileStore');

class NotificationStore {

    constructor() {
        this._fileStoreName = 'notificationStore';
        this._jsonStore = new JsonFileStore();
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
        this._jsonStore.save(this._fileStoreName, this._notifications, (err) => {
            if (err) {
                console.log('Store update failed');
            }
        })
    }

    _initializeNotificationStore() {
        const data = this._jsonStore.getSyncData(this._fileStoreName);
        this._notifications = (data)? data : [];
    }
}

module.exports = NotificationStore;