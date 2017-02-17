class Pair {
    constructor(pairString) {
        this._pair = pairString.split(',');
    }

    isSolo() {
        return this._pair.length === 1;
    }

    toString() {
        return this._pair.join(',');
    }

    contains(name) {
        return this._pair.includes(name);
    }

    getOtherPairOf(name) {
        if(this.isSolo())
            return null;

        return this._pair.find(pairName => pairName !== name);
    }

    getPair() {
        return this._pair;
    }
}

module.exports = Pair;