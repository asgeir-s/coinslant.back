'use strict';

const numberOfDataCollectRetrys = 5;

module.exports.collectData = (database, lambda, sns, dataCollectLambdas) => {
    return database.getAllItems('coinslant-meta')
        .then(coinsMeta => {
            return Promise.all(dataCollectLambdas.map(_ => collectDataFromFunction(coinsMeta, numberOfDataCollectRetrys, _)))
                .then(log('data colected from data-colect-functions'))
                .then(collectedData => {
                    const metaUpdates = createDatabaseMetaUpdates('coinslant-meta', coinsMeta, collectedData);
                    const out = addDatabaseDataUpdates('coinslant-data', 'coinslant-meta', metaUpdates, collectedData, Date.now(), coinsMeta);
                    return out;
                })
        })
        //.then(database.batchPut)
        .then(res => {
            return {
                statusCode: 200,
                body: JSON.stringify(res),
            };
        })


    function collectDataFromFunction(coinsMeta, retrysLeft, functionName) {
        return new Promise((resolve, reject) => {
            if (retrysLeft < 0) {
                console.log(`all function retrys for function ${functionName} has failed. Returns an empety update object (no updates from this datacollector is included in this update)`);
                sns.publish({
                    "subject": `Data collect function: ${functionName} has failed`,
                    "message": `All retrys for function ${functionName} has failed. An empety update object was returned instead (no updates from this datacollector is included in this update)`
                })
                resolve({});
            }
            resolve(lambda.invoke(coinsMeta, functionName)
                .catch(error => {
                    console.log(`${functionName} (lambda data collect function) returned an error ${error}`)
                    console.log('starting first retry')
                    return collectDataFromFunction(lambda, functionName, retrysLeft--)
                }))

        })
    }
};



const log = message => _ => (console.log(message), _)

function createDatabaseMetaUpdates(metaDataTableName, oldCoinsMeta, collectedData) {

    return oldCoinsMeta.reduce((prev, coinMeta) => {
        const newCoinsMeta = collectedData.reduce((prev, updates) => {
            if (!updates[coinMeta.coinName] || !updates[coinMeta.coinName].meta) {
                return prev;
            }
            else {
                return overWriteValues(prev, updates[coinMeta.coinName].meta)
            }
        }, coinMeta)

        //console.log('new:', JSON.stringify(newCoinsMeta, null, 2))
        prev[metaDataTableName].push({
            PutRequest: {
                Item: newCoinsMeta
            }
        })
        return prev;

    }, { [metaDataTableName]: [] })

    function overWriteValues(destination, source) {
        Object.keys(source).forEach(key => {
            if (source[key] !== null && typeof source[key] === 'object') {
                destination[key] = overWriteValues(destination[key], source[key])
            }
            else {
                destination[key] = source[key]
            }
        })
        return destination;
    }
}

function addDatabaseDataUpdates(dataTableName, metaTableName, databaseUpdates, collectedData, time, coinsMeta) {
    databaseUpdates[dataTableName] = [];
    return coinsMeta.reduce((prevOut, coinMeta) => {
        const newItem = collectedData.reduce((prev, updates) => {
            if (updates[coinMeta.coinName] && updates[coinMeta.coinName].data) {
                Object.keys(updates[coinMeta.coinName].data).forEach(key => {
                    prev[key] = updates[coinMeta.coinName].data[key]
                })
            }
            return prev;
        }, {
                "coinName": coinMeta.coinName,
                "timestamp": time
            })

        prevOut[dataTableName].push({
            PutRequest: {
                Item: newItem
            }
        })
        return prevOut;
    }, databaseUpdates);
}