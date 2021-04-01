/**
 * Create a new object based on the attrs values of the object
 * @param {Object to be copied} obj 
 * @param {attributes to be copied} attrs 
 * @returns 
 */
const copy_obj = function (obj, attrs) {
    const copied = {};
    attrs.forEach(attr => copied[attr] = obj[attr]);
    return copied;
};

module.exports = { copy_obj }