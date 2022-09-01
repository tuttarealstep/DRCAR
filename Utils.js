class Utils {
    //-------------------------------------------------------------------------
    //
    //  Static Methods
    //
    //-------------------------------------------------------------------------

    //percentage of a number
    static percentage(number, percentage) {
        return number * percentage / 100;
    }

    static getRandomValueWithPercentage(value, percentage, scale = 1) {
        value = value * scale;

        let nPercentage = Utils.percentage(value, percentage);

        return (Math.floor(Math.random() * ((value + nPercentage) - (value - nPercentage) + 1)) + (value - nPercentage)) / scale;
    }
}