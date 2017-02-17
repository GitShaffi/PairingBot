class CommonUtils {
    static formatTime(time) {
        var unit = 'second';
        if (time > 60) {
            time = time / 60;
            unit = 'minute';
        }
        if (time > 60) {
            time = time / 60;
            unit = 'hour';
        }
        if (time != 1) {
            unit = unit + 's';
        }

        time = time + ' ' + unit;
        return time;
    }

    static isToday(timeStamp) {
        let today = new Date().toDateString();
        let lastUpdatedDate = new Date(timeStamp).toDateString();
        return lastUpdatedDate === today;
    }
}

module.exports = CommonUtils;