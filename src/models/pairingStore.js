var FuzzyMatching = require('fuzzy-matching');
var JsonFileStore = require('../store/jsonFileStore');
var Pair = require('./pair');
var PairStat = require('./pairStat');

class PairingStore {

    constructor() {
        this.fileStoreName = 'pairingStore';
        this.jsonStore = new JsonFileStore();
        this.personList = new FuzzyMatching();
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

    updatePairInfo(pair) {

        let pairInfo = (pair.length > 1)? this.pairingStore[pair.toString()] || this.pairingStore[`${pair[1]},${pair[0]}`]
                                            : this.pairingStore[pair.toString()];
        
        if (pairInfo || (pairInfo = this.pairingStore[this._findNearestMatch(pair)])) {
            if (!this._isAlreadyUpdatedForCurrentDay(pairInfo)) {
                pairInfo.count += 1;
                pairInfo.timeStamp = new Date().getTime();
            }
        } else {
            pairInfo = this.pairingStore[pair.toString()] = {
                count: 1,
                timeStamp: new Date().getTime()
            }
            this.personList = new FuzzyMatching(Object.keys(this.pairingStore));
        }

    }
    
    _findNearestMatch(pair) {
        let fuzzyResult = [
            this.personList.get(pair.toString(), { maxChanges: 4 }),
            this.personList.get(`${pair[1]},${pair[0]}`, { maxChanges: 4 })
        ];
        let nearestNameMatch = fuzzyResult.reduce(
            (prev, current) => (prev.distance > current.distance) ? prev : current);
        return nearestNameMatch.value;
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
            this.personList = new FuzzyMatching(Object.keys(data));
        });
    }
}

module.exports = PairingStore;