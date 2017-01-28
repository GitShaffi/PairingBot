class PairStat {
    constructor(pair, pairInfo) {
        this.pair = pair;
        this.pairInfo = pairInfo;
    }

    getPair() {
        return this.pair;
    }

    getPairInfo() {
        return this.pairInfo;
    }
}

module.exports = PairStat;