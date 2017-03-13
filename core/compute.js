'use strict';

// TEST neede
exports.computeCommunityGrowth = coinMeta => {
    return coinMeta.github.starsDelta24.reduce((last, thiseNum) => last + thiseNum, 0) +
        coinMeta.reddit.subscribersDelta24.reduce((last, thiseNum) => last + thiseNum, 0) +
        coinMeta.twitter.followersDelta24.reduce((last, thiseNum) => last + thiseNum, 0)
}

// TEST neede
exports.communityActivity = coinMeta => {
    return 0
}

// TEST neede
exports.developmentActivity = coinMeta => {
    return 0
}

// TEST neede
exports.generalInterest = coinMeta => {
    return 0
}
