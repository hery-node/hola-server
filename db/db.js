const mongoist = require('mongoist');
const { get_settings } = require('../setting');
const { LOG_DB, is_log_debug, is_log_error, log_debug, log_error } = require('../http/error');

/**
 * Construct mongodb ObjectId
 * @param {string value of the id} id 
 * @returns 
 */
const oid = (id) => {
    return mongoist.ObjectId(id);
};

/**
 * Construct objectId query object
 * @param {string value of the id} id 
 * @returns id query if id is valid otherwise return null
 */
const oid_query = (id) => {
    try {
        return { _id: oid(id) };
    } catch (e) {
        return null;
    }
};

/**
 * Construct in query of ObjectId array
 * @param {string value of the id} ids 
 * @returns id in query if id is valid otherwise return null
 */
const oid_queries = (ids) => {
    try {
        const id_array = ids.map(id => oid(id));
        return { _id: { $in: id_array } };
    } catch (e) {
        return null;
    }
};

/**
 * Execute bulk update using the items
 * @param {mongodb collection} col 
 * @param {the items to execute bulk update} items 
 * @param {the attributes used as search criteria} attrs 
 * @returns 
 */
const bulk_update = async (col, items, attrs) => {
    const bulk = col.initializeOrderedBulkOp();
    for (const item of items) {
        const query = {};
        attrs.forEach(function (attr) {
            query[attr] = item[attr];
        });
        bulk.find(query).upsert().update({ "$set": item }, true);
    }
    return await bulk.execute();
};

class DB {

    constructor(url, poolSize) {
        if (!url) {
            return;
        }

        this.db = mongoist(url, { autoReconnect: true, poolSize: poolSize });

        this.db.on('error', function (err) {
            if (is_log_error()) {
                log_error(LOG_DB, err);
            }
        });
    }

    /**
     * Insert Object to db
     * @param {mongodb collection name} code 
     * @param {inserted object} obj 
     * @returns 
     */
    create(code, obj) {
        if (is_log_debug()) {
            log_debug(LOG_DB, "creating obj:" + JSON.stringify(obj) + ", for [" + code + "]");
        }

        const col = this.db[code];
        return col.insert(obj);
    }

    /**
     * Update the object, upsert:true, multi:true
     * @param {mongodb collection name} code 
     * @param {*} query 
     * @param {*} obj 
     * @returns 
     */
    update(code, query, obj) {
        if (is_log_debug()) {
            log_debug(LOG_DB, "updating obj:" + JSON.stringify(obj) + ", for [" + code + "] with query:" + JSON.stringify(query));
        }

        const col = this.db[code];
        return col.update(query, { "$set": obj }, { upsert: true, multi: true });
    }

    /**
     * Remove the records from mongodb
     * @param {mongodb collection name} code 
     * @param {query to execute delete op} query 
     * @returns 
     */
    delete(code, query) {
        if (is_log_debug()) {
            log_debug(LOG_DB, "deleting objects for [" + code + "] with query:" + JSON.stringify(query));
        }

        const col = this.db[code];
        return col.remove(query);
    }

    /**
     * Search the db using query
     * @param {mongodb collection name} code 
     * @param {search criteria} query 
     * @param {the attributes to load from db} attr 
     * @returns 
     */
    find(code, query, attr) {
        if (is_log_debug()) {
            log_debug(LOG_DB, "find objects for [" + code + "] with query:" + JSON.stringify(query) + " and attr:" + JSON.stringify(attr));
        }

        const col = this.db[code];
        return col.find(query, attr);
    }

    /**
     * Find one record from db
     * @param {mongodb collection name} code 
     * @param {search criteria} query 
     * @param {the attributes to load from db} attr 
     * @returns 
     */
    find_one(code, query, attr) {
        if (is_log_debug()) {
            log_debug(LOG_DB, "find_one for [" + code + "] with query:" + JSON.stringify(query) + " and attr:" + JSON.stringify(attr));
        }

        const col = this.db[code];
        return col.findOne(query, attr);
    }

    /**
     * Find the records from db using sort to do sorting
     * @param {mongodb collection name} code 
     * @param {search criteria} query 
     * @param {sort object to sort the result} sort 
     * @param {the attributes of the object to load from db} attr 
     * @returns 
     */
    find_sort(code, query, sort, attr) {
        if (is_log_debug()) {
            log_debug(LOG_DB, "find_sort for [" + code + "] with query:" + JSON.stringify(query) + " and attr:" + JSON.stringify(attr) + " and sort:" + JSON.stringify(sort));
        }

        const col = this.db[code];
        return col.find(query, attr, { sort: sort });
    }

    /**
     * Find the page records
     * @param {mongodb collection name} code 
     * @param {search criteria} query 
     * @param {sort object to sort the results} sort 
     * @param {the page index to load} page 
     * @param {page size } limit 
     * @param {the attributes of the object to load from db} attr 
     * @returns 
     */
    find_page(code, query, sort, page, limit, attr) {
        if (is_log_debug()) {
            log_debug(LOG_DB, "find_page for [" + code + "] with query:" + JSON.stringify(query) + " and attr:" + JSON.stringify(attr) + " and sort:" + JSON.stringify(sort) + ", page:" + page + ",limit:" + limit);
        }

        const skip = (page - 1) * limit > 0 ? (page - 1) * limit : 0;
        const col = this.db[code];
        return col.find(query, attr, { sort: sort, skip: skip, limit: limit });
    }

    /**
     * The count number of the query
     * @param {mongodb collection name} code 
     * @param {search criteria} query 
     * @returns 
     */
    count(code, query) {
        if (is_log_debug()) {
            log_debug(LOG_DB, "count for [" + code + "] with query:" + JSON.stringify(query));
        }

        const col = this.db[code];
        return col.count(query);
    }

    /**
     * Calculate the sum value based on the field and query criteria
     * @param {mongodb collection name} code 
     * @param {search criteria} query 
     * @param {field name to calculate sum} field 
     * @returns 
     */
    sum(code, query, field) {
        if (is_log_debug()) {
            log_debug(LOG_DB, "sum for [" + code + "] with query:" + JSON.stringify(query) + ", and field:" + JSON.stringify(field));
        }

        const col = this.db[code];
        return col.aggregate([{ "$match": query }, { "$group": { _id: null, total: { "$sum": "$" + field + "" } } }])
            .then(result => result.length > 0 ? result[0].total : 0);
    }

    /**
     * Pull the object from array
     * @param {mongodb collection name} code 
     * @param {search criteria} query 
     * @param {object pulled from the array} ele 
     * @returns 
     */
    pull(code, query, ele) {
        if (is_log_debug()) {
            log_debug(LOG_DB, "pull ele [" + JSON.stringify(ele) + "] with query:" + JSON.stringify(query) + ",code:" + code);
        }

        const col = this.db[code];
        return col.update(query, { "$pull": ele }, { multi: true });
    }

    /**
     * Push the object to array
     * @param {mongodb collection name} code 
     * @param {search criteria} query 
     * @param {object push to the array} ele 
     * @returns 
     */
    push(code, query, ele) {
        if (is_log_debug()) {
            log_debug(LOG_DB, "push ele [" + JSON.stringify(ele) + "] with query:" + JSON.stringify(query) + ",code:" + code);
        }

        const col = this.db[code];
        return col.update(query, { "$push": ele });
    }

    /**
    * add the object to set
    * @param {mongodb collection name} code 
    * @param {search criteria} query 
    * @param {object added to the set} ele 
    * @returns 
    */
    add_to_set(code, query, ele) {
        const col = this.db[code];
        return col.update(query, { "$addToSet": ele }, { upsert: true });
    };

    /**
     * Get the mongodb collection
     * @param {mongodb collection name} code 
     * @returns 
     */
    col(code) {
        return this.db[code];
    }
}

let db_instance = new DB();

/**
 * 
 * @returns db instance of mongodb
 */
const get_db = () => {
    if (db_instance && db_instance.db) {
        return db_instance;
    } else {
        const mongo = get_settings().mongo;

        db_instance = new DB(mongo.url, mongo.pool);
        return db_instance;
    }
}

module.exports = { oid, oid_query, oid_queries, bulk_update, get_db };
