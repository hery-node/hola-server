/**
 * 
 * @returns Random code generated based on Math
 */
const random_code = function () {
    return Math.floor(Math.random() * 1000000);
};

module.exports = { random_code }