/*
projects are number of projects ever created (does not remove removed projects)
*/

'use strict';
{
    const githubSecret = require("./secret/github.json")
    var githubClient = require('octonode').client(githubSecret.token);
    var ghsearch = githubClient.search();

}
module.exports.handler = (coinsMeta, context, cb) => {
    console.log('event:', JSON.stringify(coinsMeta, null, 2))

    getProjectsSinceLastUpdate(coinsMeta)
        .then(extrectNumberOfNewProjects(coinsMeta))
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

const extrectNumberOfNewProjects = coinsMeta => gitHubRespondses => {
    return gitHubRespondses.reduce((prev, thisRes) => {
        const index = thisRes[0]
        const body = thisRes[1]

        const numberOfNewProjects = body.total_count
        const totalCreatedProjects = coinsMeta[index].projects ? coinsMeta[index].projects + numberOfNewProjects : numberOfNewProjects

        prev[coinsMeta[index].coinName] = {
            "meta": {
                "github": {
                    "projectsDelta24": numberOfNewProjects,
                    "projects": totalCreatedProjects
                }
            },
            "data": {
                "github": {
                    "projects": totalCreatedProjects
                }
            }
        }
        return prev
    }, {})
}

function getProjectsSinceLastUpdate(coinsMeta) {
    const promises = coinsMeta.map((coinMeta, index) => {
        const lastUpdateTime = new Date(coinMeta.lastUpdateTime)
        const searchTerm = coinMeta.github.searchTerm ? coinMeta.github.searchTerm : coinMeta.coinName
        return new Promise((resolve, reject) => {
            ghsearch.repos({
                q: `${searchTerm} created:>=${lastUpdateTime.toISOString().substr(0, 16)}`,
                sort: 'created',
                order: 'asc'
            }, (err, result) => err ? reject([index, err]) : resolve([index, result]) //array of search results);
            )
        })
    })
    return Promise.all(promises)
}

const log = message => _ => (console.log(message), _)
