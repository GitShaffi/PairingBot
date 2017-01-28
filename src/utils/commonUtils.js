class CommonUtils {
    formatTime(time) {
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
}

module.exports = CommonUtils;