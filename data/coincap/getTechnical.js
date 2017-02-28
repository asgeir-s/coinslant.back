/*
projects are number of projects ever created (does not remove removed projects)
*/

'use strict';
const http = require('http')
module.exports.handler = (coinsMeta, context, cb) => {
  console.log('event:', JSON.stringify(coinsMeta, null, 2))

  getCoinCapData()
    .then(extrectData(coinsMeta))
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

const extrectData = coinsMeta => coincapRespondses => {
  return coinsMeta.reduce((prev, coin) => {
    const respondseForCoin = coincapRespondses.find(coinRes => coinRes.long.toLowerCase() == coin.coinName.toLowerCase())
    if (!respondseForCoin) {
      console.error(`found no respondse for ${coin.coinName}. Will continue to next coin`)
      return prev;
    }
    const price = parseFloat(respondseForCoin.price)
    const marketCap = parseFloat(respondseForCoin.mktcap)
    const usdVolume24 = parseInt(respondseForCoin.usdVolume)
    const totalSuply = parseInt(respondseForCoin.supply)
    const vwap24 = parseFloat(respondseForCoin.vwapData)

    const priceDelta24 = coin.technical.price != null ? price - coin.technical.price : 0
    const marketCapDelta24 = coin.technical.marketCap != null ? marketCap - coin.technical.marketCap : 0

    prev[coin.coinName] = {
      "meta": {
        "technical": {
          "price": price,
          "priceDelta24": priceDelta24,
          "marketCap": marketCap,
          "marketCapDelta24": marketCapDelta24,
          "usdVolume24": usdVolume24
        }
      },
      "data": {
        "technical": {
          "price": price,
          "marketCap": marketCap,
          "usdVolume24": usdVolume24,
          "totalSuply": totalSuply,
          "vwap24": vwap24
        }
      }
    }
    return prev
  }, {})
}

function getCoinCapData() {
  return new Promise((resolve, reject) => {
    let body = '';
    http.get('http://www.coincap.io/front', res => {
      res.on('data', chunk => body += chunk)
      res.on('end', () => resolve(JSON.parse(body)))
      res.on('error', () => reject(body))
    })
  })

}

const log = message => _ => (console.log(message), _)
