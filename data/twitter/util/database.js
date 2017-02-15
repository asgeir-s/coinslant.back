// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#batchWrite-property

exports.init = function (aws) {
    docClient = getDocumentClient(aws)
    const service = {
        metaForCoin: getMetaData.bind(null, docClient, 'coinslant-meta', 'coinName'),
        metaDataAll: getMetaDataAll.bind(null, docClient, 'coinslant-meta'),
        batchPut: batchPut.bind(null, docClient)
    };
    return service;
}

function getDocumentClient(aws) {
    return new aws.DynamoDB.DocumentClient({
        apiVersion: '2012-08-10'
    });
}

function getMetaData(docClient, tableName, keyName, keyValue) {
    return docClient.get({
        TableName: tableName,
        Key: {
            [keyName]: keyValue
        }
    }).promise()
}

function getMetaDataAll(docClient, tableName) {
    return docClient.scan({
        TableName: tableName
    }).promise().then(_ => _.Items)
}

function batchPut(docClient, update) {
    return docClient.batchWrite({
        RequestItems: update
    }).promise()
}

/*
exports.init =  function (aws) {
    getDocumentClient(aws).then(docClient => {
        const service = {
            metaForCoin: getMetaData.bind(null, docClient, 'coinslant-meta', 'coinName'),
            metaDataAll: getMetaDataAll.bind(null, docClient, 'coinslant-meta')
        };
        return service;
    })
}
*/