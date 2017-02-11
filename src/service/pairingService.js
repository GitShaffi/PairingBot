class PairingService {
    
    constructor(peopleStore, pairingStore) {
        this.peopleStore = peopleStore;
        this.pairingStore = pairingStore;
    }

    processCommitFrom(message) {
        let commitHashRegex = /\|\b[0-9a-f]{8}\b>:/g;
        let commitMessageRegex = /(.*)(?:\n\s|\s)-(.*)/g;
        let commitHashLength = 11;
        let matchFound = false;
        let commitTexts = message.attachments[0].text.split(/\S\n\S/)
        commitTexts.forEach(commitText => {
            let commitIndex = commitText.search(commitHashRegex) + commitHashLength;
            let commitDataWithAuthorName = commitText.substring(commitIndex);
            let commitRawStrings = commitMessageRegex.exec(commitDataWithAuthorName);
            if(commitRawStrings && commitRawStrings.length > 1) {
                let commitMessage = commitRawStrings[1].trim();
                let commitPusher = commitRawStrings[2].trim();
                let pair = this._extractPairNames(commitMessage, commitPusher);
                this._updatePairInfoFor(pair);
                matchFound = true;
            }
        }); 

        if (matchFound) {
            this.pairingStore.saveCurrentStatToJsonStore();
        }
    }

    getPairingStats() {
        return this.pairingStore.getPairingStats();
    }

    getMembersWithoutStatsUpdatedToday(){
        const updatedMembers = this.pairingStore.getPairsWithStatsUpdatedToday()
                         .map(pair => pair.getPair())
                         .reduce((prev, current) => prev.concat(current), []);
        const membersWithUpdatedStats = new Set(updatedMembers);
        const membersWithoutUpdatedStats = this.peopleStore.getMemberList().filter(member => !membersWithUpdatedStats.has(member));
        return membersWithoutUpdatedStats;
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
        let regexForNamesWithinSquareBraces = '\\[([a-zA-Z]*)(?:\s?(?:\/|\|)\s?)?([a-zA-Z]*)\\].*$';
        let regexForNamesWithColon = '([a-zA-Z]*)(?:\s?(?:\/|\|)\s?)?([a-zA-Z]*)\\s?:.*$';
        let regexForNamesWithHyphen = '([a-zA-Z]*)(?:\s?(?:\/|\|)\s?)?([a-zA-Z]*).?\\-\\s.*$';
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