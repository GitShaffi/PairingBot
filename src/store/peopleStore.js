var FuzzyMatching = require('fuzzy-matching');
var JsonFileStore = require('./jsonFileStore');

class PeopleStore {

    constructor() {
        this.fileStoreName = 'peopleStore';
        this.maxCharDeviationForFuzzy = 4;
        this.jsonStore = new JsonFileStore();
        this.memberFuzzyList = new FuzzyMatching();
        this.memberList = [];
        this.expectedMemberCount = 0;
        this._initializePeopleStore();
    }

    saveMemberListToJsonStore() {
        let storeJson = {   memberList: this.memberList,
                            expectedMemberCount: this.expectedMemberCount
                        };
        this.jsonStore.save(this.fileStoreName, storeJson, (err) => {
            if (err) {
                console.log('Store update failed');
            }
        })
    }

    setExpectedMemberCount(count) {
        count = Number(count);
        if(!Number.isNaN(count) && this.memberList.length > count){
            return false;
        }

        this.expectedMemberCount = count;
        this.saveMemberListToJsonStore();
        return true;
    }

    getExpectedMemberCount() {
        return this.expectedMemberCount;
    }

    addMember(memberName) {
        memberName = memberName.toLowerCase().trim()
        if(this.memberList.includes(memberName)){
            return false;
        }

        if(this.memberList.length === this.expectedMemberCount)
            this.expectedMemberCount += 1;
        this.memberList.push(memberName);
        this.memberFuzzyList = new FuzzyMatching(this.memberList);
        this.saveMemberListToJsonStore();
        return true;
    }

    removeMember(memberName) {
        memberName = memberName.toLowerCase().trim()
        var index = this.memberList.indexOf(memberName);
        if (index === -1) {
            return false;
        }

        this.memberList.splice(index, 1);
        this.memberFuzzyList = new FuzzyMatching(this.memberList);
        this.saveMemberListToJsonStore();

        return true;
    }

    getMemberList() {
        return this.memberList;
    }

    getMembersFuzzyMatch(pairString) {
        return this.memberFuzzyList.get(pairString, { maxChanges: this.maxCharDeviationForFuzzy });
    }

    _initializePeopleStore() {
        this.jsonStore.getData(this.fileStoreName, (data, err) => {
            if (err) {
                console.log('Store retrieve failed');
                return;
            }
            this.memberList = data.memberList;
            this.memberFuzzyList = new FuzzyMatching(data.memberList);
            this.expectedMemberCount = Number(data.expectedMemberCount);
        });
    }
}

module.exports = PeopleStore;