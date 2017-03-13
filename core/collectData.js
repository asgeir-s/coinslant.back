'use strict';

const compute = require('./compute')

module.exports.collectData = (database, lambda, sns, config) => {
    return database.getAllItems('coinslant-meta')
        .then(coinsMeta => {
            return Promise.all(config.dataCollect.functions.map(_ => collectDataFromFunction(coinsMeta, _, config.dataCollect.retrys)))
                .then(log('data colected from data-colect-functions'))
                .then(collectedData => {
                    const timestamp = Date.now()
                    const metaUpdates = createDatabaseMetaUpdates('coinslant-meta', coinsMeta, collectedData, timestamp, config.updatesPerDay);
                    const out = addDatabaseDataUpdates('coinslant-data', 'coinslant-meta', metaUpdates, collectedData, timestamp, coinsMeta);
                    return out;
                })
        })
        //.then(_ => log(JSON.stringify(_))(_))
        .then(database.batchPut)
        .then(res => {
            return {
                statusCode: 200,
                body: `Done! responds from dynamodb: ${JSON.stringify(res)}`,
            };
        })


    function collectDataFromFunction(coinsMeta, functionName, retrysLeft) {
        return new Promise((resolve, reject) => {
            if (retrysLeft < 0) {
                console.log(`all function retrys for function ${functionName} has failed. Returns an empety update object (no updates from this datacollector is included in this update)`);
                sns.publish(`Data collect function: ${functionName} has failed`,
                    `All retrys for function ${functionName} has failed. An empety update object was returned instead (no updates from this datacollector is included in this update)`)
                resolve({});
            }
            else {
                resolve(lambda.invoke(coinsMeta, functionName)
                    .catch(error => {
                        console.log(`${functionName} (lambda data collect function) returned an error ${error}`)
                        console.log('retrys left:', retrysLeft)
                        return collectDataFromFunction(coinsMeta, functionName, retrysLeft - 1)
                    }))
            }
        })
    }
};

// TEST needed
const log = message => _ => (console.log(message), _)

// TEST needed
function createDatabaseMetaUpdates(metaDataTableName, oldCoinsMeta, collectedData, timestamp, updatesPerDay) {
    return oldCoinsMeta.reduce((prev, coinMeta) => {
        const newCoinMeta = collectedData.reduce((prev, updates) => {
            if (!updates[coinMeta.coinName] || !updates[coinMeta.coinName].meta) {
                return prev;
            }
            else {
                return overWriteValues(prev, updates[coinMeta.coinName].meta, updatesPerDay)
            }
        }, Object.assign(coinMeta, {}))

        newCoinMeta.lastUpdateTime = timestamp

        // initializ data in computed if it exists
        if (newCoinMeta.computed == null) newCoinMeta.computed = {}

        newCoinMeta.computed = overWriteValues(newCoinMeta.computed, {
            "communityGrowth24": compute.computeCommunityGrowth(coinMeta)
            //"communityActivity24": compute.communityActivity(coinMeta),
            //"developmentActivity24": compute.developmentActivity(coinMeta),
            //"generalInterest24": compute.generalInterest(coinMeta)
        }, updatesPerDay)

        //console.log('new:', JSON.stringify(newCoinsMeta, null, 2))
        prev[metaDataTableName].push({
            PutRequest: {
                Item: newCoinMeta
            }
        })
        return prev;

    }, { [metaDataTableName]: [] })
}

// TEST neede
function addDatabaseDataUpdates(dataTableName, metaTableName, databaseUpdates, collectedData, time, coinsMeta) {
    databaseUpdates[dataTableName] = [];
    return coinsMeta.reduce((prevOut, coinMeta) => {
        const newItem = collectedData.reduce((prev, updates) => {
            if (updates[coinMeta.coinName] && updates[coinMeta.coinName].data) {
                prev = merge(prev, updates[coinMeta.coinName].data)
            }
            return prev;
        }, {
                "coinName": coinMeta.coinName,
                "timestamp": time,
                "computed": {
                    "communityGrowth24": coinMeta.computed.communityGrowth24
                    //"communityActivity24": coinMeta.computed.communityActivity24,
                    //"developmentActivity24": coinMeta.computed.developmentActivity24,
                    //"generalInterest24": coinMeta.computed.generalInterest24

                }
            })

        prevOut[dataTableName].push({
            PutRequest: {
                Item: newItem
            }
        })
        return prevOut;
    }, databaseUpdates);
}

// TEST needed

/**
 * Overvrites or add the vaiables in soucre to destination
 * 
 * destination:
 * {
 *      "item": {
 *          "deeper": {
 *              "value": 1,
 *              "stringIt": "dsad"
 *          }     
 *      },
 *      "nummis": 88,
 *      "key": "thisval"
 * }
 * 
 * source:
 * {
 *      "item": {
 *          "deeper": {
 *              "value": 300
 *          }
 *      },
 *      "key": "NEW""
 * }
 * returns:
 * {
 *      "item": {
 *          "deeper": {
 *              "value": 300,
 *              "stringIt": "dsad"
 *          }
 *      },
 *      "nummis": 88,
 *      "key": "NEW"
 * }
 * 
 * @param {any} destination 
 * @param {any} source 
 * @returns destination with the values in source added or overwritten
 */
function overWriteValues(destination, source, updatesPerDay) {
    Object.keys(source).forEach(key => {
        if (source[key] !== null && typeof source[key] === 'object') {
            destination[key] = overWriteValues(destination[key], source[key], updatesPerDay)
        }
        else {
            key.includes('24') && Array.isArray(destination[key])
                ? destination[key] = [source[key]].concat(destination[key]).slice(0, updatesPerDay)
                : destination[key] = source[key]
        }
    })
    return destination;
}

// TEST neede
function merge(destination, source) {
    Object.keys(source).forEach(key => {
        if (destination[key] !== null && typeof destination[key] === 'object') {
            destination[key] = merge(destination[key], source[key])
        }
        else {
            destination[key] = source[key]
        }
    })
    return destination
}