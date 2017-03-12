'use strict';

exports.computeCommunityGrowth = coinMeta => {
    return coinMeta.github.starsDelta24.reduce((last, thiseNum) => last + thiseNum, 0) +
        coinMeta.reddit.subscribersDelta24.reduce((last, thiseNum) => last + thiseNum, 0) +
        coinMeta.twitter.followersDelta24.reduce((last, thiseNum) => last + thiseNum, 0)
}

exports.communityActivity = coinMeta => {
    return 0
}

exports.developmentActivity = coinMeta => {
    return 0
}

exports.generalInterest = coinMeta => {
    return 0
}
