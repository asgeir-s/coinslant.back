'use strict'

{
    const twitterSecret = require("./secret/twitter.json")
    const Twit = require('twit')
    var twit = new Twit({
        consumer_key: twitterSecret.consumer_key,
        consumer_secret: twitterSecret.consumer_secret,
        app_only_auth: true,
        timeout_ms: 60 * 1000,  // optional HTTP request timeout to apply to all requests.
    })
}

module.exports.getFollowers = (coinsMeta, context, cb) => {
    console.log('event:', JSON.stringify(coinsMeta, null, 2))

    const twitterUsernames = getTwitterNamesFromMeta(coinsMeta)
    console.log(`got ${twitterUsernames.length} twitter usernames from coinsMeta (input)`)
    return getTwitterUsers(twitterUsernames)
        .then(_ => log(`got ${_.length} twitter users as respondse from Twitter`)(_))
        .then(extractFollowers(coinsMeta))
        .then(res => {
            return {
                statusCode: 200,
                body: JSON.stringify(res)
            }
        })
        .then(_ => cb(null, _))
        .catch(err => cb(err))
}

const extractFollowers = coinsMeta => twitterUsers => {
    return coinsMeta.reduce((prev, coinMeta) => {
        const twitterUsernameForCoin = coinMeta.twitter.username
        const twitterUserForCoin = twitterUsers.find(user => user.screen_name.toLowerCase() == twitterUsernameForCoin.toLowerCase())

        const newNumOfFollowers = twitterUserForCoin.followers_count

        prev[coinMeta.coinName] = {
            "meta": {
                "twitter": {
                    "followersDelta24": coinMeta.twitter.followers != null ? newNumOfFollowers - coinMeta.twitter.followers : 0,
                    "followers": newNumOfFollowers
                }
            },
            "data": {
                "twitter": {
                    "followers": newNumOfFollowers
                }
            }
        }
        return prev;
    }, {})
}

function getTwitterNamesFromMeta(coinsMeta) {
    return coinsMeta.map(coin => coin.twitter.username)
}

function getTwitterUsers(users) {
    return twit.get('users/lookup', { screen_name: users })
        .then(res => res.data)
}

const log = message => _ => (console.log(message), _)
