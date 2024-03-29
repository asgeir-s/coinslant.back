'use strict';

const config = require('./config')
{
  const aws = require('aws-sdk')
  var database = require('./util/database').init(aws);
  var lambda = require('./util/lambda').init(aws);
  var sns = require('./util/sns').init(aws, config.sns.errorTopicArn)
}
const collectDataFunction = require('./collectData').collectData

module.exports.collectData = (event, context, cb) => {
  collectDataFunction(database, lambda, sns, config)
    .then(_ => cb(null, _))
    .catch(_ => cb(_))
};