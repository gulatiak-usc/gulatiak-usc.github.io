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
    const autoCompleteSuggestions = new Array();
    const requestPromises = new Array();
    
    const searchQuery = event.pathParameters.query;
    const promise1 = promisifyHTTPS(`https://api.tiingo.com/tiingo/utilities/search?query=${searchQuery}&token=${tiingoApiToken}`);

    requestPromises.push(promise1);

    await Promise.all(requestPromises)
        .then(responses => {
            
            var autoCompleteSuggestionsFull = responses[0];

            for(var i = 0; i < autoCompleteSuggestionsFull.length; ++i) {
                var autoCompleteSuggestion = autoCompleteSuggestionsFull[i];
                autoCompleteSuggestions.push({
                    name: autoCompleteSuggestion.name,
                    ticker: autoCompleteSuggestion.ticker,
                    description: autoCompleteSuggestion.description
                });
            }
        })
        .catch(error_ => {
            
           error = error_;
        });
            
    return new Promise(function(resolve, reject) {
        if (autoCompleteSuggestions.length != 0){
            resolve({
                "statusCode": 200,
                "body": JSON.stringify(autoCompleteSuggestions),
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