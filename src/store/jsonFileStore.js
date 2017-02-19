const Store = require("jfs");

class JsonFileStore {
    constructor() {
        this._db = new Store("data");
    }

    getData(storeName, callback) {
        this._db.get(storeName, function (err, data) {
            if (err) {
                console.log('Store retrieve failed');
                callback(null);
                return;
            }

            callback(data);
        });
    }

    getSyncData(storeName){
        let data = this._db.getSync(storeName);
        
        if(data.message) {
            console.log('Store retrieve failed');
            data = null;
        }

        return data;
    }

    save(storeName, data) {
        this._db.save(storeName, data, function (err) {
            if (err) {
                console.log('Store update failed');
            }
        });
    }
}

module.exports = JsonFileStore;