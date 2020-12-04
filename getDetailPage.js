const https = require('https')

const newsApiToken = '55a6f082efac416fbd1e8d2be394bb29';
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
    const detail = {};
    const requestPromises = new Array();
    
    const stockTicker = event.pathParameters.ticker;
    const promise1 = promisifyHTTPS(`https://api.tiingo.com/tiingo/daily/${stockTicker}?token=${tiingoApiToken}`);
    const promise2 = promisifyHTTPS(`https://api.tiingo.com/iex/?tickers=${stockTicker}&token=${tiingoApiToken}`);
    const promise3 = promisifyHTTPS(`https://newsapi.org/v2/everything?apiKey=${newsApiToken}&q=${stockTicker}&pageSize=50`);

    requestPromises.push(promise1);
    requestPromises.push(promise2);
    requestPromises.push(promise3);

    await Promise.all(requestPromises)
        .then(responses => {
            detail.DetailInfo = (({ name, ticker, description }) => ({ name, ticker, description }))(responses[0]);
            detail.DetailStats = (({ last, prevClose, low, bidPrice, open, mid, high, volume }) => ({ last, prevClose, low, bidPrice, open, mid, high, volume }))(responses[1][0]);
            
            var newsObjects = new Array();
            var newsArticles = responses[2].articles;
            for (var i = 0; i < newsArticles.length; ++i) {
                newsObjects.push({
                    source: newsArticles[i].source.name,
                    publishedAt: newsArticles[i].publishedAt,
                    url: newsArticles[i].url,
                    urlToImage: newsArticles[i].urlToImage,
                    title: newsArticles[i].title
                });
            }
            
            detail.DetailNews = newsObjects;
        })
        .catch(error_ => {
            
           error = error_;
        });
            
    return new Promise(function(resolve, reject) {
        if (detail != {}){
            resolve({
                "statusCode": 200,
                "body": JSON.stringify(detail),
                "isBase64Encoded": false
            });
        } else {
            reject({
                "statusCode": 500,
                "body": "INTERNAL SERVER ERROR",
                "isBase64Encoded": false
            });
        }
    });
}