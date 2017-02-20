exports.init = (aws) => {
    const lambda = getDocumentClient(aws)
    const service = {
        invoke: invoke.bind(null, lambda)
    };
    return service;
}

function getDocumentClient(aws) {
    return new aws.Lambda({
        apiVersion: '2015-03-31'
    });
}

function invoke(lambda, data, functionName) {
    return lambda.invoke({
        FunctionName: functionName,
        Payload: JSON.stringify(data),
        InvocationType: "RequestResponse",
        LogType: "Tail" // returns log in 'x-amz-log-result' header
    }).promise()
        .then(_ => {
            const payload = JSON.parse(_.Payload)
            if (payload.errorMessage) {
                throw new Error(payload.errorMessage)
            }
            else {
                return JSON.parse(payload.body)
            }
        })
}