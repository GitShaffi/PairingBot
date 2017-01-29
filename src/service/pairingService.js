class PairingService {
    
    constructor(peopleStore, pairingStore) {
        this.peopleStore = peopleStore;
        this.pairingStore = pairingStore;
    }

    processCommitFrom(message) {
        let commitHashRegex = /\|\b[0-9a-f]{8}\b>:/gm;
        let match;
        let matchFound = false;
        while (match = commitHashRegex.exec(message.attachments[0].text)) {
            let commitIndex = match.index + 11;
            let commitRawStrings = message.attachments[0].text.substring(commitIndex).split('\n');
            let commitMessage = commitRawStrings[0].trim();
            let commitPusherRaw = commitRawStrings[1].split('-');
            let commitPusher = commitPusherRaw.pop();
            let pair = this._extractPairNames(commitMessage, commitPusher);
            this._updatePairInfoFor(pair);
            matchFound = true;
        }

        if (matchFound) {
            this.pairingStore.saveCurrentStatToJsonStore();
        }
    }

    getPairingStats() {
        return this.pairingStore.getPairingStats();
    }

    addPair(pair) {
        pair = pair.filter(name => !!name).map(name => name.toLowerCase().trim());
        
        if(!this._updatePairInfoFor(pair))
            return false;
        
        this.pairingStore.saveCurrentStatToJsonStore();
        return true;
    }

    _updatePairInfoFor(pair) {
        let pairMatch = this._findNearestMatch(pair);
        
        if(pairMatch.filter(name => !name).length !== 0) {
            console.log('Unable to identify match for pair:', pair.toString());
            return false;
        }

        let pairInfo = this._findPairInfo(pairMatch);
        this.pairingStore.updatePairInfo(pairMatch, pairInfo);
        return true;
    }

    _extractPairNames(commitMessage, commitPusher) {
        let regexForNamesWithinSquareBraces = '\\[([a-zA-Z]*)(?:\/)?([a-zA-Z]*)\\].*$';
        let regexForNamesWithColon = '([a-zA-Z]*)(?:\/)?([a-zA-Z]*)\\s?:.*$';
        let regexForNamesWithHyphen = '([a-zA-Z]*)(?:\/)?([a-zA-Z]*).?\\-\\s.*$';
        let regexText = new RegExp(`${regexForNamesWithinSquareBraces}|${regexForNamesWithColon}|${regexForNamesWithHyphen}`);

        let match = regexText.exec(commitMessage)
        if (match) {
            match.shift();
            let pair = match.filter(name => !!name).map(name => name.toLowerCase().trim());
            return pair;
        }
        return [commitPusher.toLowerCase().trim()];
    }

    _findPairInfo(pairMatch) {
        let pairInfo = (pairMatch.length > 1)? this.pairingStore.getPairInfo(pairMatch.toString()) 
                                                        || this.pairingStore.getPairInfo(`${pairMatch[1]},${pairMatch[0]}`)
                                            : this.pairingStore.getPairInfo(pairMatch.toString());
        return pairInfo;
    }

    _findNearestMatch(pair) {
        return pair.map(name => this.peopleStore.getMembersFuzzyMatch(name).value);
    }
}

module.exports = PairingService;