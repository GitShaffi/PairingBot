var JsonFileStore = require('./jsonFileStore');

class PeopleStore {

    constructor() {
        this.fileStoreName = 'peopleStore';
        this.jsonStore = new JsonFileStore();
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
        if(this.memberList.length > count){
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
            return 'Member already exist! :confused:';
        }

        if(this.memberList.length === this.expectedMemberCount)
            this.expectedMemberCount += 1;
        this.memberList.push(memberName);
        this.saveMemberListToJsonStore();
        return `Added ${memberName} to list! :thumbsup:`;
    }

    getMemberList() {
        return this.memberList;
    }

    _initializePeopleStore() {
        this.jsonStore.getData(this.fileStoreName, (data, err) => {
            if (err) {
                console.log('Store retrieve failed');
                return;
            }
            this.memberList = data.memberList;
            this.expectedMemberCount = Number(data.expectedMemberCount);
        });
    }
}

module.exports = PeopleStore;