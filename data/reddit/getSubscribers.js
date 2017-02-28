'use strict';
{
  const snoowrap = require('snoowrap')
  const redditSecret = require('./secret/reddit.json')

  var reddit = new snoowrap({
    userAgent: redditSecret.userAgent,
    clientId: redditSecret.clientId,
    clientSecret: redditSecret.clientSecret,
    username: redditSecret.username,
    password: redditSecret.password
  })
}

module.exports.handler = (coinsMeta, context, cb) => {
  console.log('event:', JSON.stringify(coinsMeta, null, 2))

  getSubreddits(coinsMeta)
    .then(extrectSubcribers(coinsMeta))
    .then(_ => log('RESULTS:\n' + JSON.stringify(_, null, 2))(_))
    .then(res => {
      return {
        statusCode: 200,
        body: JSON.stringify(res),
      };
    })
    .then(_ => cb(null, _))
    .catch(err => cb(err))
};

const extrectSubcribers = coinsMeta => redditRespondses => {
  return redditRespondses.reduce((prev, thisRes) => {
    const index = thisRes[0]
    const body = thisRes[1]

    const numOfSubscribers = body.subscribers
    const activeSubscribers = body.accounts_active

    prev[coinsMeta[index].coinName] = {
      "meta": {
        "reddit": {
          "subscribersDelta24": coinsMeta[index].reddit.subscribers != null ? numOfSubscribers - coinsMeta[index].reddit.subscribers : 0,
          "subscribers": numOfSubscribers
        }
      },
      "data": {
        "reddit": {
          "subscribers": numOfSubscribers,
          "subscribersActive": activeSubscribers
        }
      }
    }
    return prev
  }, {})
}

function getSubreddits(coinsMeta) {
  const promises = [];
  coinsMeta.forEach((coinMeta, index) => {
    if (coinMeta.reddit && coinMeta.reddit.sub) {
      promises.push(reddit.getSubreddit(coinMeta.reddit.sub).fetch().then(_ => [index, _]))
    }
  })
  return Promise.all(promises)
}

const log = message => _ => (console.log(message), _)
