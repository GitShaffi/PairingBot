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
}

module.exports = Pair;