const https = require('https')

const tiingoApiToken = '9f11b3eb116caeba85e53228af06f329bde34061';

const promisifyHTTPS = function(url) {
    return new Promise(function(resolve, reject) {
        https.get(url, (res) => {
        let body = "";
        res.on("data", (chunk) => {
            body += chunk;
        });
        
        res.on("end", () => {
            try {
                let json = JSON.parse(body);
                resolve(json);
            } catch (error) {
                console.error(error.message);
                reject(error.message);
            };
        });
      }).on('error', (e) => {
        reject(Error(e))
      })
    });
}

exports.handler = async function(event) {

    const error = {};
    const stocks = {};
    const requestPromises = new Array();
    
    console.log(JSON.stringify(event, null, 2))
    const tickers = event.queryStringParameters.tickers.split(',');
    
    for (var i = 0; i < tickers.length; ++i) {
        requestPromises.push(promisifyHTTPS(`https://api.tiingo.com/iex/?tickers=${tickers[i]}&token=${tiingoApiToken}`));
        requestPromises.push(promisifyHTTPS(`https://api.tiingo.com/tiingo/daily/${tickers[i]}?token=${tiingoApiToken}`));
    }

    await Promise.all(requestPromises)
        .then(responses => {
            
            for (var i = 0; i < requestPromises.length; i=i+2) {
                stocks[tickers[i/2]] = {};
                stocks[tickers[i/2]].last = responses[i][0].last;
                stocks[tickers[i/2]].prevClose = responses[i][0].prevClose;
                stocks[tickers[i/2]].name = responses[i+1].name
            }
        })
        .catch(error_ => {
            
           error = error_;
        });
            
    return new Promise(function(resolve, reject) {
        if (stocks != {}){
            resolve({
                "statusCode": 200,
                "body": JSON.stringify(stocks),
                "isBase64Encoded": false
            });
        } else {
            reject({
                "statusCode": 500,
                "body": "INTERNAL SERVER ERROR",
                "isBase64Encoded": false
            })
        }
    });
}