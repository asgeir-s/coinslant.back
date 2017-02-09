'use strict'
const firebaseAdmin = require("firebase-admin")

// contain secrets
{
  const firebaseSecret = require("./secret/firebase.json")
  const twitterSecret = require("./secret/twitter.json")

  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(firebaseSecret),
    databaseURL: "https://coinslant.firebaseio.com"
  })

  const Twit = require('twit')
  var T = new Twit({
    consumer_key: twitterSecret.consumer_key,
    consumer_secret: twitterSecret.consumer_secret,
    app_only_auth: true,
    timeout_ms: 60 * 1000,  // optional HTTP request timeout to apply to all requests.
  })
}
// Get a database reference to our blog
{
  const database = firebaseAdmin.database()
  var coinsRef = database.ref("/coins/")
  var databaseRootRef = database.ref('/')
}

module.exports.getUsers = (event, context) => {
  return updateFollowCount(event, coinsRef, databaseRootRef)
    .then(res => context.done(null, res))
    .catch(err => context.done(err, null))
}

function updateFollowCount(event, coinsRef, databaseRootRef) {
  let coins
  return getDataFromRefOnce(coinsRef)
    .then(coinsRes => coins = coinsRes)
    .then(getTwitterNamesFromDb)
    .then(twitterUsernames =>
      (console.log(`got ${twitterUsernames.length} twitter usernames from the database: ${twitterUsernames}`), twitterUsernames))
    .then(getTwitterUsers)
    .then(twitterUsers =>
      (console.log(`got ${twitterUsers.length} twitter usernames as respondse from Twitter`), twitterUsers))
    .then(twitterUsers => createDbUpdateObject(coins, Date.now(), twitterUsers))
    .then(dbUpdateObject =>
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
    .catch(err => log('something went wrong: ' + err))

  function createDbUpdateObject(coins, timestamp, twitterUsers) {
    return Object.keys(coins).reduce((prev, coinName) => {
      const twitterUsernameForCoin = coins[coinName].twitter.name
      const twitterUserForCoin = twitterUsers.find(user => user.screen_name.toLowerCase() == twitterUsernameForCoin.toLowerCase())
      prev['coins/' + coinName + '/twitter/followers'] = twitterUserForCoin.followers_count
      prev['history/twitter/' + coinName + '/' + timestamp] = twitterUserForCoin.followers_count
      prev['coins/' + coinName + '/twitter/followerDelta24'] = twitterUserForCoin.followers_count - coins[coinName].twitter.followers
      return prev
    }, {})
  }

  function getDataFromRefOnce(ref) {
    return ref.once('value')
      .then(snap => snap.val())
  }

  function getTwitterNamesFromDb(coins) {
    return Object.keys(coins).map(coin => coins[coin].twitter.name)
  }

  function getTwitterUsers(users) {
    return T.get('users/lookup', { screen_name: users })
      .then(res => res.data)
  }
}