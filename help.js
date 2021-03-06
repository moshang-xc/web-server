const fs = require('fs');
const path = require('path');
const DEFAULTINDEX = ['index.html', 'index.htm', 'index.asp', 'index.aspx'];
// const DATAFILE = ['index.json', 'data.json', 'index.txt', 'data.txt'];
const dataFolderArr = ['goform', 'data', 'json', 'localdata'];
let cwd = process.cwd();

function getIndexPage() {
    let file;
    DEFAULTINDEX.every((val, index) => {
        let filepath = path.join(cwd, val);
        if (fs.existsSync(filepath)) {
            global.console.log(filepath);
            file = fs.readFileSync(filepath);
            return false;
        } else {
            return true;
        }
    });
    return file;
}

/**
 * 
 * @param {function} callback 数据读取后的回调，该地方采用异步进行文件读取
 */
function loadData(callback) {
    let rootPath = travelPath(cwd);
    if (rootPath === '') {
        global.console.log('没有检索到任何数据文件信息.');
        return;
    }
    let paths = scanJSONFile(rootPath) || [];

    if (paths.length === 0) {
        global.console.log('没有检索到任何数据文件信息.');
        return;
    }

    paths.forEach(item => {
        loadFileData(item, callback);
    });
}

/**
 * 
 * @param {String} filePath 数据文件地址
 * @param {Function} callback 回调 
 */
function loadFileData(filePath, callback) {
    if (fs.existsSync(filePath)) {
        fs.readFile(filePath, function(err, fileStr) {
            if (err || !fileStr) {
                global.console.error(err);
                return;
            }
            try {
                let obj = JSON.parse(fileStr.toString('utf-8'));
                let key = filePath.substring(filePath.indexOf('goform') + 7);
                key = key.substring(0, key.lastIndexOf('/')) || "";
                let obj1 = {};
                if (key) {
                    for (let t in obj) {
                        if (isObject(obj[t])) {
                            obj1[key + t] = obj[t];
                        } else {
                            obj1[t] = obj[t];
                        }
                    }
                } else {
                    obj1 = obj;
                }
                callback(obj1);
            } catch (e) {
                global.console.log(`解析数据文件出错：${e}`);
            }
        });
        global.console.log(`检索到的数据文件地址为：${filePath}`);
    }
}

function isObject(obj) {
    return Object.prototype.toString.call(obj) === '[object Object]';
}

/**
 * 扫描给定路劲下的所有json数据文件
 * @param {String} dir 需要扫描的路劲
 */
function scanJSONFile(filePath) {
    let paths = [];
    fs.readdirSync(filePath).forEach(item => {
        let pathname = path.join(filePath, item);
        if (fs.statSync(pathname).isDirectory()) {
            paths = paths.concat(scanJSONFile(pathname));
        } else if (/\.json$/.test(pathname)) {
            paths.push(pathname.replace(/\\/g, '/'));
        }
    });
    return paths;
}

/**
 * 找到数据文件对应的文件夹
 * @param {String} dir 需要扫描的路劲
 */
function travelPath(dir) {
    let rootPath = '';
    fs.readdirSync(dir).every((file) => {
        var pathname = path.join(dir, file);
        if (fs.statSync(pathname).isDirectory()) {
            if (dataFolderArr.indexOf(path.basename(file)) > -1) {
                rootPath = pathname;
                return false;
            } else {
                rootPath = travelPath(pathname) || rootPath;
            }
            return true;
        }
        return true;
    });
    return rootPath;
}

function readFile(filePath) {
    if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath);
    } else {
        return false;
    }
}

function handleData(data, newData) {
    for (let key in newData) {
        //此处遍历的是模块名称
        if (newData.hasOwnProperty(key)) {
            if (/^set/.test('key')) {
                return;
            }
            updateDataBase(data, key.replace(/^set/, 'get'), newData[key]);
        }
    }
}

function getType(obj) {
    return Object.prototype.toString.call(obj);
}

function updateDataBase(dataBase, prop, value) {
    let oldData = dataBase[prop];
    if (oldData === undefined || value === "") {
        return;
    }

    if (getType(oldData) == '[object Array]') {

        if (getType(value) == '[object Array]' && value && value.length > 0 && typeof value[0] != 'object') {
            dataBase[prop] = value;
            return;
        }

        if (getType(value) != '[object Object]') {
            return;
        }

        try {
            var key = value.key || 'ID',
                curData = oldData,
                id = 1;
            if (curData && curData.length > 0) {
                id = curData[curData.length - 1][key];
            }

            switch (value.type) {
                case 'add':
                    {
                        //给新增的数据加上key属性
                        if (getType(value.data) === '[object Object]') {
                            value.data[key] = ++id;
                        } else if (getType(value.data) === '[object Array]') {
                            // for (let i = 0, l = value.data.length; i < l; i++) {
                            //     //新增的情况下怎么返回对应的ID号
                            //     value.data[i][key] = ++id;
                            // }
                            value.data.forEach((item, index) => {
                                item[key] = ++id;
                            });
                        }

                        dataBase[prop] = curData.concat(value.data);
                    }
                    break;
                case 'delete':
                    {
                        for (let i = 0, l = curData.length; i < l; i++) {
                            if (value.data.indexOf(curData[i][key]) > -1) {
                                dataBase[prop].splice(i, 1);
                                i--;
                                l--;
                            }
                        }
                    }
                    break;
                case 'switch':
                case 'edit':
                    {
                        let valData = {};
                        if (getType(value.data) === '[object Object]') {
                            valData[value.data[key]] = value.data;
                        } else {
                            for (let tt in value.data) {
                                if (value.data.hasOwnProperty(tt)) {
                                    let d = value.data[tt];
                                    valData[d[key]] = d;
                                }
                            }
                        }

                        for (let j = 0, len = curData.length; j < len; j++) {
                            let id = curData[j][key];
                            if (valData[id] !== undefined && valData[id] !== '') {
                                Object.assign(dataBase[prop][j], valData[id]);
                            }
                        }
                    }
                    break;
            }
        } catch (e) {
            global.console.log('操作数据出错!');
            global.console.log(e);
        }
        return;
    } else if (getType(oldData) == '[object Object]') {
        Object.assign(dataBase[prop], value);
    } else if (oldData != value) {
        dataBase[prop] = value;
    }
}

module.exports = {
    getIndexPage,
    loadData,
    readFile,
    loadFileData,
    handleData
};