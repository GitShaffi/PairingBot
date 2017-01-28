
var PairingStore = require('../models/pairingStore');

class PairingService {
    
    constructor() {
        this.pairingStore = new PairingStore();
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
            this.pairingStore.updatePairInfo(pair);
            matchFound = true;
        }

        if (matchFound) {
            this.pairingStore.saveCurrentStatToJsonStore();
        }
    }

    getPairingStats() {
        return this.pairingStore.getPairingStats();
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
}

module.exports = PairingService;