/*
projects are number of projects ever created (does not remove removed projects)
*/

'use strict';

const stackExchangeSecret = require("./secret/stackExchange.json")

{
  const stackexchangeLib = require('stackexchange');
  var stackExchange = new stackexchangeLib({ version: 2.2 })
}
module.exports.handler = (coinsMeta, context, cb) => {
  console.log('event:', JSON.stringify(coinsMeta, null, 2))

  getProjectsSinceLastUpdate(coinsMeta)
    .then(extrectNumberOfNewQuestions(coinsMeta))
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

const extrectNumberOfNewQuestions = coinsMeta => gitHubRespondses => {
  return gitHubRespondses.reduce((prev, thisRes) => {
    const index = thisRes[0]
    const body = thisRes[1]
    const numberOfNewQuestions = body.items.length
    const totalCreatedQuestions = coinsMeta[index].stackExchange.questions ? coinsMeta[index].stackExchange.questions + numberOfNewQuestions : numberOfNewQuestions

    prev[coinsMeta[index].coinName] = {
      "meta": {
        "stackExchange": {
          "questionsDelta24": numberOfNewQuestions,
          "questions": totalCreatedQuestions
        }
      },
      "data": {
        "stackExchange": {
          "questions": totalCreatedQuestions
        }
      }
    }
    return prev
  }, {})
}

function getProjectsSinceLastUpdate(coinsMeta) {
  const promises = coinsMeta.map((coinMeta, index) => {
    const lastUpdateTime = new Date(coinMeta.lastUpdateTime * 1000)
    const fromdate = parseInt(lastUpdateTime.getTime() / 1000)
    console.log('fromdate:', fromdate)
    const tag = coinMeta.stackExchange.tag ? coinMeta.stackExchange.tag : coinMeta.coinName
    console.log('tag:', tag)
    return new Promise((resolve, reject) => {
      stackExchange.questions.questions({
        key: stackExchangeSecret.apiKey,
        pagesize: 100,
        tagged: tag,
        sort: 'activity',
        order: 'asc',
        fromdate: fromdate //1486944000
      }, (err, result) => err ? reject([index, err]) : resolve([index, result]));
    })
  })
  return Promise.all(promises)
}

const log = message => _ => (console.log(message), _)
