const JsonFileStore = require('./jsonFileStore');
const Pair = require('../models/pair');
const PairStat = require('../models/pairStat');
const CommonUtils = require('../utils/commonUtils');

class PairingStore {

    constructor() {
        this.fileStoreName = 'pairingStore';
        this.jsonStore = new JsonFileStore();
        this.pairingStore = {};
        this.pairingStats = null;
        this.commonUtils = new CommonUtils();
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

    getPairsWithStatsUpdatedToday() {
        let pairs = Object.keys(this.pairingStore);

        if (!pairs.length) {
            return null;
        }
        const pairsWithStatsUpdatedToday = pairs.filter(pairString => {
            let pairInfo = this.pairingStore[pairString];
            return this.commonUtils.isToday(pairInfo.timeStamp);
        }).map((pairString) => new Pair(pairString));

        return pairsWithStatsUpdatedToday;
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
        return this.commonUtils.isToday(pairInfo.timeStamp);
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