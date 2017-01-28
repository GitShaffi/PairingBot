var Store = require("jfs");

class JsonFileStore {
    constructor() {
        this.db = new Store("data");
    }

    getData(storeName, callback) {
        this.db.get(storeName, function (err, data) {
            callback(data, err);
        });
    }

    save(storeName, data, callback) {
        this.db.save(storeName, data, function (err) {
            callback(err);
        });
    }
}

module.exports = JsonFileStore;