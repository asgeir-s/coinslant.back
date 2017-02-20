'use strict';

{
  const aws = require('aws-sdk')
  var database = require('./util/database').init(aws);
  var lambda = require('./util/lambda').init(aws);
}
const dataCollectFunctions = require('./data-collect-functions.json')

module.exports.collectData = (event, context, cb) => {
  return database.getAllItems('coinslant-meta')
    .then(coinsMeta => {
      return callDataCollectors(dataCollectFunctions)(coinsMeta)
        .then(log('data sucessfullt colected from all colect-functions'))
        .then(collectedData => {
          const metaUpdates = createDatabaseMetaUpdates('coinslant-meta', coinsMeta, collectedData);
          const out = addDatabaseDataUpdates('coinslant-data', 'coinslant-meta', metaUpdates, collectedData, Date.now(), coinsMeta);
          console.log('out', out)
          return out;
        })
    })
    .then(_ => log('raw log:', _)(_))

    .then(database.batchPut)
    .then(_ => log('raw log:', _)(_))
    .then(_ => log(JSON.stringify(_))(_))
    .then(res => {
      return {
        statusCode: 200,
        body: JSON.stringify(res),
      };
    })
    .then(_ => cb(null, _))
    .catch(err => cb(err))

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
};

const callDataCollectors = dataCollectors => coinsMeta =>
  Promise.all(dataCollectors.map(lambda.invoke.bind(null, coinsMeta)));

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
    console.log('prevOut', prevOut)
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