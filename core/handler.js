'use strict';

{
  const aws = require('aws-sdk')
  var database = require('./util/database').init(aws);
  var lambda = require('./util/lambda').init(aws);
}
const dataCollectFunctions = require('./data-collect-functions.json')

module.exports.collectData = (event, context, callback) => {
  database.getAllItems('coinslant-meta')
    .then(callDataCollectors(dataCollectFunctions))
    .then(log('data sucessfullt colected from all colect-functions'))
    .then(_ => log(JSON.stringify(_))(_))

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Go Serverless v1.0! Your function executed successfully!',
      input: event
    }),
  };

  return callback(null, response);

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
};

const callDataCollectors = dataCollectors => coinsMeta =>
  Promise.all(dataCollectors.map(lambda.invoke.bind(null, coinsMeta)));
const log = message => _ => (console.log(message), _)