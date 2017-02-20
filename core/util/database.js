// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#batchWrite-property

exports.init = (aws) => {
    const docClient = getDocumentClient(aws)
    const service = {
        getItem: getItem.bind(null, docClient),
        getAllItems: getAllItems.bind(null, docClient),
        batchPut: batchPut.bind(null, docClient)
    };
    return service;
}

function getDocumentClient(aws) {
    return new aws.DynamoDB.DocumentClient({
        apiVersion: '2012-08-10'
    });
}

/**
 *  Example keyObject: 
 * {
 *  "coinName": "Bitcoin"
 * }
 *
 * @param {any} docClient
 * @param {string} tableName
 * @param {Object} keyObject
 * @returns the item corresponding to the key, if any
 */
function getItem(docClient, tableName, keyObject) {
    return docClient.get({
        TableName: tableName,
        Key: keyObject
    }).promise()
}

function getAllItems(docClient, tableName) {
    return docClient.scan({
        TableName: tableName
    }).promise().then(_ => _.Items)
}

/**
 * Takes a abritary larg update batchWrite-request and splitts it up in
 * batchWrite-request of max 25 requests each (with is the limit for DynamoDB 
 * batchWrite).
 * 
 * @param {Object} updates for batchWrite
 * @returns array of updates that are not larger then 25 each
 */
function splitbatchWriteRequest(updates) {
    const writeRequests = [[]]; // array of array of requests
    let writeRequestsIndex = 0;
    let currentNumOfItems = 0;

    function addRequest(tableName, writeRequest) {
        if (currentNumOfItems < 25) {
            writeRequests[writeRequestsIndex][tableName].push(writeRequest);
            currentNumOfItems++;
        }
        else {
            writeRequests[++writeRequestsIndex] = [];
            writeRequests[writeRequestsIndex][tableName] = [];
            writeRequests[writeRequestsIndex][tableName].push(writeRequest)
            currentNumOfItems = 1;
        }
    }

    Object.keys(updates).forEach(tableName => {
        writeRequests[0][tableName] = [];
        console.log('tableName:', tableName)
        updates[tableName].forEach(writeRequests => {
            addRequest(tableName, writeRequests)
        })
    })

    return writeRequests
}

function batchPut(docClient, updates) {
    console.log('batchPut - updates:', updates)
    const promises = splitbatchWriteRequest(updates)
        .map(_ => {
            console.log('updaterequest:', JSON.stringify(_))
            return docClient.batchWrite({
                RequestItems: _
            }).promise()
        })

    return Promise.all(promises);
}
