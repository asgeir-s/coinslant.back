'use strict'

// contain secrets

{
    const Database = require('../util/database');
    const twitterSecret = require("./secret/twitter.json")

    const Twit = require('twit')
    var T = new Twit({
        consumer_key: twitterSecret.consumer_key,
        consumer_secret: twitterSecret.consumer_secret,
        app_only_auth: true,
        timeout_ms: 60 * 1000,  // optional HTTP request timeout to apply to all requests.
    })
    var database = Database.init(require('aws-sdk'));
}

module.exports.getUsers = (event, context, cb) => {
    return updateFollowCount(database, event)
        .then(_ => context.done(null, _))
        .catch(err => context.done(err, null))
}


function updateFollowCount(database, event) {
    let coins
    return database.metaDataAll()
        .then(coinsMeta => {
            coins = coinsMeta;
            return getTwitterNamesFromDb(coinsMeta)
        })
        .then(twitterUsernames =>
            (console.log(`got ${twitterUsernames.length} twitter usernames from the database: ${twitterUsernames}`), twitterUsernames))
        .then(getTwitterUsers)
        .then(twitterUsers =>
            (console.log(`got ${twitterUsers.length} twitter usernames as respondse from Twitter`), twitterUsers))
        .then(twitterUsers => createDbUpdateObject(coins, Date.now(), twitterUsers))
        .then(_ => console.log(JSON.stringify(_, null, 2)))
        /* .then(dbUpdateObject =>
             (console.log('updateObject: ' + JSON.stringify(dbUpdateObject, null, 2)), dbUpdateObject))
         .then(dbUpdateObject => databaseRootRef.update(dbUpdateObject))
         .then(dbUpdateRespondse => {
             return {
                 statusCode: 200,
                 body: JSON.stringify({
                     message: `updated the twitter follow count`,
                     input: event,
                     databaseUpdateres: dbUpdateRespondse
                 })
             }
         })
    */
        .catch(err => log('something went wrong: ' + err))

    function createDbUpdateObject(coins, timestamp, twitterUsers) {
        return coins.reduce((prev, coin) => {
            const twitterUsernameForCoin = coin.twitter.username
            const twitterUserForCoin = twitterUsers.find(user => user.screen_name.toLowerCase() == twitterUsernameForCoin.toLowerCase())

            coin.twitter.followerDelta24 = twitterUserForCoin.followers_count - coin.twitter.followers
            coin.twitter.followers = twitterUserForCoin.followers_count

            prev.RequestItems['Table-1'].push({
                Item: coin
            })
            return prev;
        }, {
                RequestItems: {
                    'Table-1': []
                }
            })
    }
}

function getTwitterNamesFromDb(coins) {
    return coins.map(coin => coin.twitter.username)
}

function getTwitterUsers(users) {
    return T.get('users/lookup', { screen_name: users })
        .then(res => res.data)
}
