'use strict';

exports.sns = {
    errorTopicArn: "arn:aws:sns:us-east-1:494753849073:dataCollectError"
}

exports.dataCollect = {
    retrys: 5,
    functions: [
        "github-dev-getStars",
        "github-dev-getNumberOfNewProjects",
        "twitter-dev-getFollowers",
        "reddit-dev-getSubscribers"
    ]
}