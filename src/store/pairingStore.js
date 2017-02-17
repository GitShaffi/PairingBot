const JsonFileStore = require('./jsonFileStore');
const Pair = require('../models/pair');
const PairStat = require('../models/pairStat');
const CommonUtils = require('../utils/commonUtils');

class PairingStore extends JsonFileStore {

    constructor() {
        super();
        this._fileStoreName = 'pairingStore';
        this._pairingStore = {};
        this._pairingStats = null;
        this._initializePairingStore();
    }

    saveCurrentStatToJsonStore() {
        this.save(this._fileStoreName, this._pairingStore);
    }

    getPairingStats() {
        let pairs = Object.keys(this._pairingStore);

        if (!pairs.length) {
            return null;
        }

        let pairingStats = pairs.map((pairString) => {
            let pair = new Pair(pairString);
            let pairInfo = this._pairingStore[pairString];
            return new PairStat(pair, pairInfo);
        });

        return pairingStats;
    }

    getPairsWithStatsUpdatedToday() {
        let pairs = Object.keys(this._pairingStore);
        if (!pairs.length) {
            return [];
        }
        const pairsWithStatsUpdatedToday = pairs.filter(pairString => {
            let pairInfo = this._pairingStore[pairString];
            return CommonUtils.isToday(pairInfo.timeStamp);
        }).map((pairString) => new Pair(pairString));

        return pairsWithStatsUpdatedToday;
    }

    getPairInfo(pairString) {
        return this._pairingStore[pairString];
    }

    updatePairInfo(pair, pairInfo) {
        if (pairInfo) {
            if (!this._isAlreadyUpdatedForCurrentDay(pairInfo)) {
                pairInfo.count += 1;
                pairInfo.timeStamp = new Date().getTime();
            }
        } else {
            pairInfo = this._pairingStore[pair.toString()] = {
                count: 1,
                timeStamp: new Date().getTime()
            }
        }

    }
    
    _isAlreadyUpdatedForCurrentDay(pairInfo) {
        return CommonUtils.isToday(pairInfo.timeStamp);
    }

    _initializePairingStore() {
        this.getData(this._fileStoreName, (data) => {
                this._pairingStore = (data)? data : this._pairingStore;
        });
    }
}

module.exports = PairingStore;