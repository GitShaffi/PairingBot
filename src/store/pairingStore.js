var JsonFileStore = require('./jsonFileStore');
var Pair = require('../models/pair');
var PairStat = require('../models/pairStat');

class PairingStore {

    constructor() {
        this.fileStoreName = 'pairingStore';
        this.jsonStore = new JsonFileStore();
        this.pairingStore = {};
        this.pairingStats = null;
        this._initializePairingStore();
    }

    saveCurrentStatToJsonStore() {
        this.jsonStore.save(this.fileStoreName, this.pairingStore, (err) => {
            if (err) {
                console.log('Store update failed');
            }
        })
    }

    getPairingStats() {
        let pairs = Object.keys(this.pairingStore);

        if (!pairs.length) {
            return null;
        }

        let pairingStats = [];
        pairs.forEach((pairString) => {
            let pair = new Pair(pairString);
            let pairInfo = this.pairingStore[pairString];
            pairingStats.push(new PairStat(pair, pairInfo));
        });

        return pairingStats;
    }

    getPairInfo(pairString) {
        return this.pairingStore[pairString];
    }

    updatePairInfo(pair, pairInfo) {
        if (pairInfo) {
            if (!this._isAlreadyUpdatedForCurrentDay(pairInfo)) {
                pairInfo.count += 1;
                pairInfo.timeStamp = new Date().getTime();
            }
        } else {
            pairInfo = this.pairingStore[pair.toString()] = {
                count: 1,
                timeStamp: new Date().getTime()
            }
        }

    }
    
    _isAlreadyUpdatedForCurrentDay(pairInfo) {
        let today = new Date().toDateString();
        let lastUpdatedDate = new Date(pairInfo.timeStamp).toDateString();
        return lastUpdatedDate === today;
    }

    _initializePairingStore() {
        this.jsonStore.getData(this.fileStoreName, (data, err) => {
            if (err) {
                console.log('Store retrieve failed');
                return;
            }
            this.pairingStore = data;
        });
    }
}

module.exports = PairingStore;