const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const axios = require('axios');
const cheerio = require('cheerio');
const ProgressBar = require('progress');
const readline = require('readline-sync');

// Guards against symlink loops on the server (e.g. "current -> .")
const MAX_DEPTH = 10;

const http = axios.create({
    timeout: 30000,
    // Ask for the raw bytes and keep them as served, so a .tar.gz sent with
    // "Content-Encoding: gzip" is not silently decompressed on disk
    headers: { 'Accept-Encoding': 'identity' },
    decompress: false
});

async function start() {
    const input = process.argv[2] || readline.question('URL: ');

    if (!input) {
        console.log('No url provided, exiting...');
        process.exit(1);
    }

    let rootUrl;

    try {
        rootUrl = new URL(input);
    } catch {
        console.log(`Invalid url: ${input}`);
        process.exit(1);
    }

    rootUrl.search = '';
    rootUrl.hash = '';

    if (!rootUrl.pathname.endsWith('/')) {
        rootUrl.pathname += '/';
    }

    const files = await collectFiles(rootUrl);

    if (!files.length) {
        console.log('No files found.');
        return;
    }

    const folder = path.resolve(`${rootUrl.host.replace(':', '_')}-${Date.now()}`);
    const failed = [];

    fs.mkdirSync(folder, { recursive: true });

    for (const [index, fileUrl] of files.entries()) {
        console.log('---------------------');
        console.log(`Downloading # ${index + 1}/${files.length}`);
        console.log(fileUrl);

        try {
            await download(fileUrl, localPath(rootUrl, fileUrl, folder));
        } catch (err) {
            console.log(`** Failed: ${err.message} **`);
            failed.push(fileUrl);
        }
    }

    console.log(`********** Downloads Completed! ${files.length - failed.length}/${files.length} saved to ${folder} **********`);

    if (failed.length) {
        console.log('Failed:');
        failed.forEach(fileUrl => console.log(`  ${fileUrl}`));
        process.exitCode = 1;
    }
}

// Walks the listing breadth-first, following only links that point below
// the directory being listed (skips parent links, sort links and other hosts)
async function collectFiles(rootUrl) {
    const files = new Set();
    const visited = new Set();
    const queue = [rootUrl];

    while (queue.length) {
        const dirUrl = queue.shift();

        if (visited.has(dirUrl.href)) {
            continue;
        }

        visited.add(dirUrl.href);
        console.log(`Listing ${dirUrl.href}`);

        let links;

        try {
            links = await collectLinks(dirUrl);
        } catch (err) {
            console.log(`** Failed to list ${dirUrl.href}: ${err.message} **`);
            continue;
        }

        for (const link of links) {
            if (!link.pathname.endsWith('/')) {
                files.add(link.href);
            } else if (depth(rootUrl, link) <= MAX_DEPTH) {
                queue.push(link);
            } else {
                console.log(`Skipping ${link.href}: deeper than ${MAX_DEPTH} levels`);
            }
        }
    }

    return [...files];
}

async function collectLinks(dirUrl) {
    const links = [];
    const { data } = await http.get(dirUrl.href, { responseType: 'text' });
    const $ = cheerio.load(data);

    $('a[href]').each(function(i, element) {
        let link;

        try {
            link = new URL($(element).attr('href'), dirUrl);
        } catch {
            return;
        }

        link.search = '';
        link.hash = '';

        if (link.origin === dirUrl.origin
            && link.pathname.startsWith(dirUrl.pathname)
            && link.pathname !== dirUrl.pathname) {
            links.push(link);
        }
    });

    return links;
}

function depth(rootUrl, dirUrl) {
    return dirUrl.pathname.slice(rootUrl.pathname.length).split('/').filter(Boolean).length;
}

// Maps a remote url to a path inside the download folder. The href comes from
// the server, so every segment is decoded and checked before touching the disk
function localPath(rootUrl, fileUrl, folder) {
    const segments = new URL(fileUrl).pathname.slice(rootUrl.pathname.length).split('/').map(segment => {
        let name;

        try {
            name = decodeURIComponent(segment);
        } catch {
            name = segment;
        }

        if (!name || name === '.' || name === '..' || /[/\\\0]/.test(name)) {
            throw new Error(`unsafe file name "${segment}"`);
        }

        return name;
    });

    const target = path.resolve(folder, ...segments);
    const relative = path.relative(folder, target);

    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error(`path escapes download folder: ${target}`);
    }

    return target;
}

async function download(fileUrl, target) {
    const { data, headers } = await http.get(fileUrl, { responseType: 'stream' });
    const totalLength = Number(headers['content-length']);
    const partial = `${target}.part`;
    let received = 0;
    let progressBar;

    if (totalLength > 0) {
        progressBar = new ProgressBar('-> downloading [:bar] :percent :etas', {
            width: 40,
            complete: '=',
            incomplete: ' ',
            renderThrottle: 1,
            total: totalLength
        });
    }

    data.on('data', function(chunk) {
        received += chunk.length;

        if (progressBar && !progressBar.complete) {
            progressBar.tick(chunk.length);
        }
    });

    fs.mkdirSync(path.dirname(target), { recursive: true });

    try {
        await pipeline(data, fs.createWriteStream(partial));
    } catch (err) {
        fs.rmSync(partial, { force: true });
        throw err;
    }

    fs.renameSync(partial, target);
    console.log(`** Completed (${received} bytes) **`);
}

start();
