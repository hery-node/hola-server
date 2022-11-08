/**
 * Create a new object based on the attrs values of the object
 * @param {Object to be copied} obj 
 * @param {attributes to be copied} attrs 
 * @returns 
 */
const copy_obj = (obj, attrs) => {
    const copied = {};
    attrs.forEach(attr => copied[attr] = obj[attr]);
    return copied;
};

/**
 * Check this is object or not
 * @param {Object to be checked} obj 
 * @returns 
 */
const is_object = (obj) => {
    return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

module.exports = { copy_obj, is_object }