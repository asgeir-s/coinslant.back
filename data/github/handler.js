'use strict';
const githubClient = require('octonode').client();
const Database = require('./util/database');
const database = Database.init(require('aws-sdk'));

module.exports.getStars = (event, context, callback) => {
  doIt().then(res => {
    console.log(JSON.stringify(res, null, 2))
    const response = {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Go Serverless v1.0! Your function executed successfully!',
        input: event,
        res: res
      }),
    };

    return callback(null, response);

    // Use this code if you don't use the http event with the LAMBDA-PROXY integration
    // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
  })
};



function doIt() {
  return database.metaDataAll().then(coinsMeta => {
    return getStars(coinsMeta)
      .then(createDatabaseUpdates.bind(null, coinsMeta))
      .then(newCoinMetaUpdate => addNewCoinDataToUpdateObject('coinslant-data', 'coinslant-meta', 'github-stars', Date.now(), newCoinMetaUpdate))
      .then(database.batchPut)
  })
}

function getStars(coinsMeta) {
  const promises = [];

  coinsMeta.forEach((coinMeta, index) => {
    if (coinMeta.github && coinMeta.github.owner && coinMeta.github.repo) {
      promises.push(new Promise((resolve, reject) => {
        githubClient.get('/repos/' + coinMeta.github.owner + '/' + coinMeta.github.repo, {}, (err, status, body, headers) =>
          err ? reject([index, err]) : resolve([index, body])
        );
      }));
    }
  })
  return Promise.all(promises)
}

function createDatabaseUpdates(coinsMeta, gitHubRespondses) {
  return gitHubRespondses.reduce((prev, thisRes) => {
    const index = thisRes[0]
    const body = thisRes[1]

    coinsMeta[index].github.starsDelta24 = coinsMeta[index].github.stars ? body.stargazers_count - coinsMeta[index].github.stars: 0
    coinsMeta[index].github.stars = body.stargazers_count

    console.log('new:', JSON.stringify(coinsMeta[index], null, 2))
    prev['coinslant-meta'].push({
      PutRequest: {
        Item: coinsMeta[index]
      }
    })
    return prev
  }, { ['coinslant-meta']: [] })
}

function addNewCoinDataToUpdateObject(dataTableName, metaTableName, dataSource, timestamp, newCoinMetaUpdate) {
  newCoinMetaUpdate[dataTableName] = []
  return newCoinMetaUpdate[metaTableName].reduce((prev, coinMeta) => {
    const coinsource = coinMeta.PutRequest.Item.coinName + '-' + dataSource // bitcoin-twitter-followers
    prev[dataTableName].push({
      PutRequest: {
        Item: {
          'coin-source': coinsource,
          'time': timestamp,
          'value': coinMeta.PutRequest.Item.github.stars
        }
      }
    })
    return prev;
  }, newCoinMetaUpdate)
}