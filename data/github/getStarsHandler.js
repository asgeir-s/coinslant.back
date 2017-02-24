'use strict';
{
  const githubSecret = require("./secret/github.json")
  var githubClient = require('octonode').client(githubSecret.token);
}
module.exports.handler = (coinsMeta, context, cb) => {
  console.log('event:', JSON.stringify(coinsMeta, null, 2))

  getGithubRepos(coinsMeta)
    .then(extrectStars(coinsMeta))
    .then(_ => log(`got GitHub stars for ${Object.keys(_).length} coins`)(_))
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

const extrectStars = coinsMeta => gitHubRespondses => {
  return gitHubRespondses.reduce((prev, thisRes) => {
    const index = thisRes[0]
    const body = thisRes[1]

    const newNumOfStars = body.stargazers_count

    prev[coinsMeta[index].coinName] = {
      "meta": {
        "github": {
          "starsDelta24": coinsMeta[index].github.stars ? newNumOfStars - coinsMeta[index].github.stars : 0,
          "stars": newNumOfStars
        }
      },
      "data": {
        "github": {
          "stars": newNumOfStars
        }
      }
    }
    return prev
  }, {})
}

function getGithubRepos(coinsMeta) {
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

const log = message => _ => (console.log(message), _)
