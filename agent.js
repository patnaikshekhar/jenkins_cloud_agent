const instanceId = process.argv[2]
const AWS = require('aws-sdk')
const request = require('request')

const dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'eu-west-2'
})

const sqs = new AWS.SQS({
    region: 'eu-west-1'
})

const INSTANCES_TABLE = 'JenkinsInstances'
const UI_UPDATE_QUEUE_URL = 'https://sqs.eu-west-2.amazonaws.com/463674642148/jenkins_cloud_ui_update'

const updateDynamo = (hostname) => new Promise((resolve, reject) => {
    const params = {
        TableName: INSTANCES_TABLE,
        Item: {
            id: instanceId,
            status: 'Completed',
            url: hostname
        }
    }
    
    console.log('In update instance', params)
    
    dynamo.put(params, (err, data) => {
        if (err) {
            console.log('Error in update instance', err)
            reject(err)
        } else {
            console.log('Done update instance')
            resolve()
        }
    })
})

const getPublicHostname = () => new Promise((resolve, reject) => {
    request.get('http://169.254.169.254/latest/meta-data/public-hostname', {}, (err, response, body) => {
        if (err) {
            reject(err)
        } else {
            resolve(body)
        }
    })
})

const postUpdateUI = () => new Promise((resolve, reject) => {
    const message = {
        action: 'updateUI'
    }

    console.log('In postUpdateUI ', message)

    const params = {
        MessageBody: JSON.stringify(message),
        QueueUrl: UI_UPDATE_QUEUE_URL
    }

    sqs.sendMessage(params, (err, data) => {
        if (err) {
            reject(err)
        } else {
            console.log('Put message in queue')
            resolve()
        }
    })
})

getPublicHostname()
    .then((hostname) => updateDynamo(hostname))
    .then(() => postUpdateUI())
    .catch(e => console.error(e))


