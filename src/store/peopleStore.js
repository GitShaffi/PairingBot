const FuzzyMatching = require('fuzzy-matching');
const JsonFileStore = require('./jsonFileStore');

class PeopleStore extends JsonFileStore {

    constructor() {
        super();
        this._fileStoreName = 'peopleStore';
        this._maxCharDeviationForFuzzy = 4;
        this._memberFuzzyList = new FuzzyMatching();
        this._memberList = [];
        this._expectedMemberCount = 0;
        this._initializePeopleStore();
    }

    setExpectedMemberCount(count) {
        count = Number(count);
        if(!Number.isNaN(count) && (count < 1 || count < this._memberList.length)){
            return false;
        }

        this._expectedMemberCount = count;
        this._saveMemberListToJsonStore();
        return true;
    }

    getExpectedMemberCount() {
        return this._expectedMemberCount;
    }

    addMember(memberName) {
        memberName = memberName.toLowerCase().trim()
        if(this._memberList.includes(memberName)){
            return false;
        }

        if(this._memberList.length === this._expectedMemberCount)
            this._expectedMemberCount += 1;

        this._memberList.push(memberName);
        this._memberFuzzyList = new FuzzyMatching(this._memberList);
        this._saveMemberListToJsonStore();
        return true;
    }

    removeMember(memberName) {
        memberName = memberName.toLowerCase().trim()
        const index = this._memberList.indexOf(memberName);
        if (index === -1) {
            return false;
        }

        this._memberList.splice(index, 1);
        this._memberFuzzyList = new FuzzyMatching(this._memberList);
        this._saveMemberListToJsonStore();

        return true;
    }

    getMemberList() {
        return this._memberList;
    }

    getMembersFuzzyMatch(pairString) {
        return this._memberFuzzyList.get(pairString, { maxChanges: this._maxCharDeviationForFuzzy });
    }

    _saveMemberListToJsonStore() {
        let storeJson = {   memberList: this._memberList,
                            expectedMemberCount: this._expectedMemberCount
                        };
        this.save(this._fileStoreName, storeJson);
    }
    
    _initializePeopleStore() {
        this.getData(this._fileStoreName, (data) => {
            
            if (!data) {
                return;
            }

            this._memberList = data.memberList;
            this._memberFuzzyList = new FuzzyMatching(data.memberList);
            this._expectedMemberCount = Number(data.expectedMemberCount);
        });
    }
}

module.exports = PeopleStore;