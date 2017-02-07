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
      Object.keys(coins).map(coinName => {
        console.log('coinName: ' + coinName)
        const twitterNameOfCoin = coins[coinName].twitter.name
        const coinTwitterUser = users.find(user => user.screen_name.toLowerCase() == twitterNameOfCoin.toLowerCase())
        coinsRef.child(coinName).child('twitter').update({
          "followers": coinTwitterUser.followers_count
        })
      })

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `updated the twitter follow count for ${users.length}) coins`,
          input: event
        })
      }
    })
}