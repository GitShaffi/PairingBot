const randomColor = require('randomcolor');

class PairingService {
    
    constructor(peopleStore, pairingStore) {
        this._peopleStore = peopleStore;
        this._pairingStore = pairingStore;
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
            this._pairingStore.saveCurrentStatToJsonStore();
        }
    }

    addPair(pair) {
        pair = pair.filter(name => !!name).map(name => name.toLowerCase().trim());
        
        if(!this._updatePairInfoFor(pair))
            return false;
        
        this._pairingStore.saveCurrentStatToJsonStore();
        return true;
    }
    
    getMissingStatsMessage() {
        const membersWithMissingStats = this._getMembersWithoutStatsUpdatedToday();
        if(membersWithMissingStats.length === 0) {
            return this._createSlackMessage('Pairing stats is up-to-date for all members! :smile:');
        }

        let members = membersWithMissingStats.map((member) => `:small_red_triangle: ${member}`).join('\n');
        return this._createSlackMessage(`Pairing stats for today is missing for the below members:\n${members}`);
    }

    getPairingStatsMessage() {
        if (!this._getPairingStats()) {
            return this._createSlackMessage('Sorry, no stats available currently! :disappointed:');
        }

        let attachments = this._getPairingStatsAsSlackFormattedMessage();
        return {attachments};
    }

    _createSlackMessage(messageText) {
        return {text: messageText};
    }
    
    _getPairingStats() {
        return this._pairingStore.getPairingStats();
    }

    _getPairingStatsAsSlackFormattedMessage() {
        let pairStats = this._getPairingStats();
        let message = this._peopleStore.getMemberList().map(member => {
            let mostRecentUpdatedAt = 0;
            
            let fields = pairStats.filter(pairStat => pairStat.getPair().contains(member))
                            .map(pairStat => {
                                    let otherPair = pairStat.getPair().getOtherPairOf(member);
                                    let columnTitle = (!otherPair)? 'Worked Solo' : `Paired with ${otherPair}`;
                                    let pairedCount = `${pairStat.getPairInfo().count} time`;
                                    
                                    if (pairStat.getPairInfo().count > 1)
                                        pairedCount = `${pairedCount}s`;
                                    
                                    mostRecentUpdatedAt = Math.max(pairStat.getPairInfo().timeStamp, mostRecentUpdatedAt); 

                                    return { title: columnTitle, value: pairedCount, short: true };
                                });
            
            if(!fields.length)
                return;
            
            let updatedAtInEpoch = mostRecentUpdatedAt/1000;
            
            return {
                fallback: "Unable to show attachments. Please contact slack support for help.",
                color: randomColor({luminosity: 'dark'}),
                pretext: '-----------------------------------------------------------------------------------',
                title: `Pairing stats for ${member.toUpperCase()}`,
                text: '---------------------------------------',
                footer: 'Last updated',
                ts: updatedAtInEpoch,
                fields
            }
        }).filter(attachment => !!attachment);

        return message;
    }

    _getMembersWithoutStatsUpdatedToday(){
        const updatedMembers = this._pairingStore.getPairsWithStatsUpdatedToday()
                         .map(pair => pair.getPair())
                         .reduce((prev, current) => prev.concat(current), []);
        const membersWithUpdatedStats = new Set(updatedMembers);
        const membersWithoutUpdatedStats = this._peopleStore.getMemberList().filter(member => !membersWithUpdatedStats.has(member));
        return membersWithoutUpdatedStats;
    }

    _updatePairInfoFor(pair) {
        let pairMatch = this._findNearestMatch(pair);
        
        if(pairMatch.filter(name => !name).length !== 0) {
            console.log('Unable to identify match for pair:', pair.toString());
            return false;
        }

        let pairInfo = this._findPairInfo(pairMatch);
        this._pairingStore.updatePairInfo(pairMatch, pairInfo);
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
        let pairInfo = (pairMatch.length > 1)? this._pairingStore.getPairInfo(pairMatch.toString()) 
                                                        || this._pairingStore.getPairInfo(`${pairMatch[1]},${pairMatch[0]}`)
                                            : this._pairingStore.getPairInfo(pairMatch.toString());
        return pairInfo;
    }

    _findNearestMatch(pair) {
        return pair.map(name => this._peopleStore.getMembersFuzzyMatch(name).value);
    }
}

module.exports = PairingService;