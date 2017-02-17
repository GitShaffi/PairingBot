class PairStat {
    constructor(pair, pairInfo) {
        this._pair = pair;
        this._pairInfo = pairInfo;
    }

    getPair() {
        return this._pair;
    }

    getPairInfo() {
        return this._pairInfo;
    }
}

module.exports = PairStat;