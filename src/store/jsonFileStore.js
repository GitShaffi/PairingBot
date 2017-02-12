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

    getSyncData(storeName){
        let data = this.db.getSync(storeName);
        
        if(data.message) {
            console.log('Store retrieve failed');
            data = null;
        }

        return data;
    }

    save(storeName, data, callback) {
        this.db.save(storeName, data, function (err) {
            callback(err);
        });
    }
}

module.exports = JsonFileStore;