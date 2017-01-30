class Pair {
    constructor(pairString) {
        this.pair = pairString.split(',');
    }

    isSolo() {
        return this.pair.length === 1;
    }

    toString() {
        return this.pair.join(',');
    }

    contains(name) {
        return this.pair.includes(name);
    }

    getOtherPairOf(name) {
        if(this.isSolo())
            return null;

        return this.pair.find(pairName => pairName !== name);
    }
}

module.exports = Pair;