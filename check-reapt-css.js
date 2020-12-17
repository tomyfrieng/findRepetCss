
/**
 * Created by yinliusheng on 2020/11/10.
 *  基于ast 找到那些 css样式没有被引用
 */
var fs = require('fs')
var path = require("path");
var csstree = require('css-tree');
var html5parser = require('html5parser');
var timeA = new Date().getTime()
var checkCssReapt = {
    classNameList: [], // wxss class 列表
    wxmlClassList: [],  // wxml class列表
    fileWxssList: [], // wxss 列表
    fileWxmlList: [], // wxml 列表
    /**
     * 入口
    */
    init: function () {
        var _this = this
        var filePath = path.resolve(__dirname, '../src')
        _this.readDirRecur(filePath, function () {
            _this.forEachWxssDir(_this.fileWxssList); // wxss 列表
            _this.forEachWxmlDir(_this.fileWxmlList); // wxml 列表
            _this.findClass(_this.wxmlClassList, _this.classNameList)
        })
    },
    /**
     * 对比classNameList和wxmlClassList 找到没有被引用的class 样式
    */
    findClass: function (wxmlClassList, classNameList) {
        var _this = this
        var a = classNameList;  // 数组小 
        var b = wxmlClassList // 数据大
        for (var i = 0; i < b.length; i++) {
            for (var j = 0; j < a.length; j++) {
                if (a[j] == b[i]) {
                    a.splice(j, 1);
                    j = j - 1;
                }
            }
        }
        _this.unique(a)
        //console.log(a)
    },
    /** 
     * 对数组去重
    */
    unique: function (arr) {
        if (!Array.isArray(arr)) {
            console.log('type error!')
            return
        }
        arr = arr.sort()
        var arrAarray = []
        for (let index = 0; index < arr.length; index++) {
            if (arr[index] != arr[index - 1]) {
                arrAarray.push(arr[index])
            }
        }
        var nodeFile = arrAarray
        fs.writeFileSync('noUseCss.js', JSON.stringify(nodeFile));
        var timeB = new Date().getTime()
        console.log(timeB-timeA)
    },
    /**
     * 通过读取某一个目录文件，获取该目录下所有的wxss和wxml文件列表
     * fileWxmlList
     * fileWxssList
    */
    readDirRecur: function (folder, callback) {
        var _this = this
        fs.readdir(folder, function (err, files) {
            var count = 0
            var checkEnd = function () {
                ++count == files.length && callback()
            }
            files.forEach(function (file) {
                var fullPath = folder + '/' + file;
                fs.stat(fullPath, function (err, stats) {
                    // 如果是文件夹，深度遍历
                    if (stats.isDirectory()) {
                        return _this.readDirRecur(fullPath, checkEnd);
                    } else {
                        /*not use ignore files*/
                        // 过滤wxss文件
                        if (typeof fullPath === 'string' && file.indexOf('.wxss') != -1) {
                            // 过滤wxss文件
                            _this.fileWxssList.push(fullPath)
                        }
                        if (typeof fullPath === 'string' && file.indexOf('.wxml') != -1) {
                            // 过滤wxss文件
                            _this.fileWxmlList.push(fullPath)
                        }
                        checkEnd()
                    }
                })
            })
            //为空时直接回调
            files.length === 0 && callback()
        })
    },
    /**
     * wxml 文件列表
     * 通过fs.readFileSync读取wxml代码，摘取class 属性
     * 引用 html5parser 插件，AST 采用html
    */
    forEachWxmlDir: function (fileList) {
        var _this = this
        if (fileList && fileList.length) {
            _this.wxmlClassList = []
            for (let index = 0; index < fileList.length; index++) {
                var contentText = fs.readFileSync(fileList[index], 'utf-8');
                const htmlAst = html5parser.parse(contentText);
                html5parser.walk(htmlAst, {
                    enter: (node) => {
                        if (node.type === html5parser.SyntaxKind.Tag) {
                            for (const attr of node.attributes) {
                                if (attr.value !== void 0 && attr.name.value == 'class') {
                                    var valString = attr.value.value;
                                    if (valString.indexOf('{{') != -1) {
                                        valString = valString.replace(/\{\{.*?\}\}/g, '');
                                    }
                                    // 判断是否含有空格
                                    if (valString.indexOf(" ") == -1) {
                                        var valStringArray = valString.split(' ')
                                        // 合并数组
                                        _this.wxmlClassList = _this.wxmlClassList.concat(valStringArray)
                                    }
                                    _this.wxmlClassList.push(valString)
                                }
                            }
                        }
                    }
                });
            }
        }
    },
    /**
     * wxss 文件列表
    */
    forEachWxssDir: function (fileList) {
        var _this = this
        if (fileList && fileList.length) {
            for (let index = 0; index < fileList.length; index++) {
                _this.getClassList(fileList[index])
            }
        }
    },
    /**
     * 
     * @param {*} cssString 
     * 通过fs.readFileSync读取wxss代码，摘取class 属性
     * 引用 csstree 插件，AST 采取css
     * ./activity_discount_coupon.wxss
     */
    getClassList: function (cssString) {
        // 读取wxss文件内容
        var _this = this
        var contentText = fs.readFileSync(cssString, 'utf-8');
        // 转化成AST
        let ast = csstree.parse(contentText)

        
        let copyAst = csstree.clone(ast);
        csstree.walk(copyAst, function (node) {
            if (node.type === 'ClassSelector') {
                _this.classNameList.push(node.name)
            }
        });
    }
}
//  初始执行
checkCssReapt.init()