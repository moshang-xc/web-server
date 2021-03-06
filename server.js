const express = require('express');
const opn = require('opn');
const bodyParser = require('body-parser');
const path = require('path');
const chokidar = require('chokidar');

let {
    getIndexPage,
    loadData,
    handleData,
    readFile,
    loadFileData
} = require('./help');

let app = express(),
    router = express.Router(),
    cwd = process.cwd(),
    port = 8090,
    curData = {},
    defaultPage;

app.use(bodyParser.json({
    limit: '1mb'
})); //这里指定参数使用 json 格式

app.use(bodyParser.urlencoded({
    extended: true
}));

if (process.argv.length > 2) {
    port = process.argv[2];
}

app.get(/\.asp$/, (req, res, next) => {
    let file = readFile(path.join(cwd, req.url));
    res.set('Content-Type', 'text/html');
    if (file) {
        res.send(file);
    } else {
        res.send(defaultPage);
    }
});

app.use(express.static(cwd));
//请求地址为空默认返回DEFAULTINDEX数组对应的页面
app.get('/', (req, res) => {
    res.set('Content-Type', 'text/html');
    res.send(defaultPage);
});

// app.get('/goform/*')
app.post('/goform/module', (req, res) => {
    let reqData = req.body;
    let postBackData = {},
        defaultData = 0;
    //处理请求的数据
    handleData(curData, reqData);
    //构造返回的数据结果
    for (let key in reqData) {
        if (reqData.hasOwnProperty(key)) {
            postBackData[key] = curData[key] || defaultData;
        }
    }

    global.console.log(`请求内容：${JSON.stringify(reqData, 2)}`);
    global.console.log(`请求返回: ${JSON.stringify(postBackData, 2)}`);
    global.console.log("-----------------------------------------------");
    res.send(JSON.stringify(postBackData));
});

//对于匹配不到的路径或者请求，返回默认页面
//区分不同的请求返回不同的页面内容
router.all('*', (req, res) => {
    if (req.method.toLowerCase() === 'get') {
        if (/\.(html|htm)/.test(req.originalUrl)) {
            res.set('Content-Type', 'text/html');
            res.send(defaultPage);
        } else {
            res.status(404).end();
        }
    } else if (req.method.toLowerCase() === 'post') {
        let postBackData = {};
        if (Object.prototype.toString(req.body) === '[object Object]') {
            for (let key in req.body) {
                if (curData.hasOwnProperty(key)) {
                    postBackData[key] = curData[key] || 0;
                }
            }
        } else {
            postBackData = {
                errorCode: 0
            };
        }
        res.send(JSON.stringify(postBackData));
    }
});


app.use(router);

defaultPage = getIndexPage() || "Show Default Mess!";

loadData((data) => {
    Object.assign(curData, data);
});

//数据文件监控
chokidar.watch(path.join(cwd, 'goform')).on('change', (fielpath) => {
    global.console.log('########################################');
    global.console.log(`Data "${fielpath}" has been changed`);
    try {
        setTimeout(() => {
            loadFileData(fielpath, (data) => {
                Object.assign(curData, data);
                global.console.log('Data Updated!');
                global.console.log('########################################');
            });
        }, 0);
    } catch (e) {
        global.console.error(e);
    }
});

module.exports = {
    run: function() {
        let openBrowser = true;
        if (process.argv.length > 3) {
            if (process.argv[3] && (process.argv[3] + '').toLowerCase() === 'n') {
                openBrowser = false;
            }
        }
        let server = app.listen(port, () => {
            let host = server.address().address;
            let port = server.address().port;
            global.console.log(`Example app listenig at http://${host}:${port}`);
            openBrowser && opn(`http://127.0.0.1:${port}`);
        });
    }
};