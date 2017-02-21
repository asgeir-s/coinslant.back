'use strict';

exports.init = (aws, topicArn) => {
    const sns = getDocumentClient(aws)
    const service = {
        publish: publish.bind(null, sns, topicArn)
    };
    return service;
}

function getDocumentClient(aws) {
    return new aws.SNS({
        apiVersion: '2010-03-31'
    });
}

function publish(sns, topicArn, {subject, message}) {
    return sns.publish({
        Message: message,
        Subject: subject,
        TopicArn: topicArn 
    }).promise()
}