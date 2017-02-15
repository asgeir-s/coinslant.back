'use strict'

{
    const Database = require('./util/database');
    const twitterSecret = require("./secret/twitter.json")

    const Twit = require('twit')
    var twit = new Twit({
        consumer_key: twitterSecret.consumer_key,
        consumer_secret: twitterSecret.consumer_secret,
        app_only_auth: true,
        timeout_ms: 60 * 1000,  // optional HTTP request timeout to apply to all requests.
    })
    var database = Database.init(require('aws-sdk'));
}

module.exports.getUsers = (event, context, cb) => {
    return updateFollowCount(database, event)
        .then(_ => cb(null, _))
        .catch(err => cb(err))
}

function updateFollowCount(database, event) {
    let coins
    return database.metaDataAll()
        .then(coinsMeta => {
            coins = coinsMeta;
            return getTwitterNamesFromDb(coinsMeta)
        })
        .then(twitterUsernames =>
            (console.log(`got ${twitterUsernames.length} twitter usernames from the database`), twitterUsernames))
        .then(getTwitterUsers)
        .then(twitterUsers =>
            (console.log(`got ${twitterUsers.length} twitter users as respondse from Twitter`), twitterUsers))
        .then(twitterUsers => createNewCoinMetaUpdateObject('coinslant-meta', coins, twitterUsers))
        .then(newCoinMetaUpdate => addNewCoinDataToUpdateObject('coinslant-data', 'coinslant-meta', 'twitter', Date.now(), newCoinMetaUpdate))
        .then(dbUpdate => database.batchPut(dbUpdate))
        .then(dbRespondse => {
            if (Object.keys(dbRespondse.UnprocessedItems).length === 0 && dbRespondse.UnprocessedItems.constructor === Object) {
                console.log('successfull write to meta-database and data-database')
            }
            else {
                console.log('error during write to meta-database and/or data-database. Respondse:', dbRespondse)
            }
            return dbRespondse
        })
        .then(dbRespondse => {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: `updated the twitter follow count`,
                    input: event,
                    databaseUpdateres: dbRespondse
                })
            }
        })
        .catch(error => console.log('something went wrong:', error))


    function createNewCoinMetaUpdateObject(metaTableName, coins, twitterUsers) {
        return coins.reduce((prev, coinMeta) => {
            const twitterUsernameForCoin = coinMeta.twitter.username
            const twitterUserForCoin = twitterUsers.find(user => user.screen_name.toLowerCase() == twitterUsernameForCoin.toLowerCase())

            coinMeta.twitter.followerDelta24 = twitterUserForCoin.followers_count - coinMeta.twitter.followers
            coinMeta.twitter.followers = twitterUserForCoin.followers_count

            prev[metaTableName].push({
                PutRequest: {
                    Item: coinMeta
                }
            })
            return prev;
        }, { [metaTableName]: [] })
    }

    function addNewCoinDataToUpdateObject(dataTableName, metaTableName, dataSource, timestamp, newCoinMetaUpdate) {
        newCoinMetaUpdate[dataTableName] = []
        return newCoinMetaUpdate[metaTableName].reduce((prev, coinMeta) => {
            const coinsource = coinMeta.PutRequest.Item.coinName + '-' + dataSource // bitcoin-twitter
            prev[dataTableName].push({
                PutRequest: {
                    Item: {
                        'coin-source': coinsource,
                        'time': timestamp,
                        'value': coinMeta.PutRequest.Item.twitter.followers
                    }
                }
            })
            return prev;
        }, newCoinMetaUpdate)
    }
}

function getTwitterNamesFromDb(coins) {
    return coins.map(coin => coin.twitter.username)
}

function getTwitterUsers(users) {
    return twit.get('users/lookup', { screen_name: users })
        .then(res => res.data)
}
