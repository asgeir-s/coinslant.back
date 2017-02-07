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
const database = firebaseAdmin.database()
const coinsRef = database.ref("/coins/")
const databaseRoot = database.ref('/')

module.exports.getUsers = (event, context, callback) => {
  return updateFollowCount(event).then(res => callback(null, res))
}

function updateFollowCount(event) {
  let coins
  return coinsRef.once('value')
    .then(coinsSnap => {
      coins = coinsSnap.val()
      return Object.keys(coins).map(coin => coins[coin].twitter.name)
    })
    .then(twitterUsernames => {
      console.log(`got ${twitterUsernames.length} twitter usernames from the database: ${twitterUsernames}`)
      return T.get('users/lookup', { screen_name: twitterUsernames })
    })
    .then(usersRes => {
      console.log(`got ${usersRes.data.length} twitter usernames as respondse from Twitter`)
      return usersRes.data
    })
    .then(users => {
      const timestamp = Date.now()
      return Object.keys(coins).reduce((prev, coinName) => {
        const twitterNameOfCoin = coins[coinName].twitter.name
        const coinTwitterUser = users.find(user => user.screen_name.toLowerCase() == twitterNameOfCoin.toLowerCase())
        prev['coins/' + coinName + '/twitter/followers'] = coinTwitterUser.followers_count
        prev['history/twitter/' + coinName + '/' + timestamp] = coinTwitterUser.followers_count
        prev['coins/' + coinName + '/twitter/followerDelta24'] = coinTwitterUser.followers_count - coins[coinName].twitter.followers
        return prev
      }, {})
    })
    .then(updateObject => {
      console.log('updateObject: ' + JSON.stringify(updateObject, null, 2))
      databaseRoot.update(updateObject)

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `updated the twitter follow count`,
          input: event,
          updateObject: updateObject
        })
      }
    })
}