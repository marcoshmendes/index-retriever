const fs = require('fs');
const nodeurl = require('url');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const ProgressBar = require('progress');
const readline = require('readline-sync');
const timestamp = Date.now();
let folder = '';

async function start() {
    const indexUrl = readline.question('URL: ');

    if (!indexUrl) {
        console.log('No url provided, exiting...');
        process.exit(1);
    }

    let urls = await collectLinks(indexUrl);

    for ([index, url] of urls.entries()) {
        console.log('---------------------');
        console.log(`Downloading # ${index}/${urls.length}`);
        await download(indexUrl, url);
    }

    console.log('********** Downloads Completed! **********');
}

async function collectLinks(url) {
    let urls = [];
    const invalidUrls = [
        '?C=N;O=D',
        '?C=M;O=A',
        '?C=S;O=A',
        '?C=D;O=A',
        '?C=N;O=A',
        '/wp-content/',
        '/',
        '../',
        ' ',
        ''
    ];

    const { data } = await axios({ 
        url,
        method: 'get',
        responseType: 'document'
    });

    let $ = cheerio.load(data);

    $('a').each(function(i, element) {
        let ref = $(element).attr('href');

        if (invalidUrls.indexOf(ref) === -1 && !ref.includes('/wp-content/uploads')) {
            urls.push($(element).attr('href'));
        }
    });

    let info = nodeurl.parse(url, true);
    
    fs.mkdirSync(`./${info.host}-${timestamp.toString()}`);
    folder = `./${info.host}-${timestamp.toString()}`;

    return urls;
}

async function download(host, url) {
    return new Promise(async function(resolve, reject) {
        console.log(host, url);
        console.log('Connecting …');

        const { data, headers } = await axios({
            url: host + url,
            method: 'get',
            responseType: 'stream'
        });

        const totalLength = headers['content-length'];
        const progressBar = new ProgressBar('-> downloading [:bar] :percent :etas', {
            width: 40,
            complete: '=',
            incomplete: ' ',
            renderThrottle: 1,
            total: +totalLength || 100
        });
        
        const writer = fs.createWriteStream(path.resolve(__dirname, folder.toString(), url));
    
        data.on('data', function(chunk) {
            progressBar.tick(chunk.length);
    
            if (progressBar.complete) {
                console.log('** Completed **');
                resolve(true);
            }
        });
    
        data.pipe(writer);
    });
}

start();

