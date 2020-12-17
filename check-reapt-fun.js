/**
 * Created by yinliusheng on 2020/11/13.
 *  基于ast找到services下有哪些文件没有被使用
 * 基于ast找到services下被引用文件中有哪些方法没有被使用
 * dir:/mryx_wxapp/src/utils/services
 */
var fs = require('fs')
var path = require("path");
// var babel = require("@babel/core");
var traverse = require('@babel/traverse').default
var parse = require('@babel/parser');
var timeA = new Date().getTime()
var checkReaptFun = {
    fileList: [],// 所有js文件
    fileArray:[], // 所有js文件中的依赖
    serveFiles:[],// services下所有的文件
    fileListObj:[],
    init:function(){
        var _this = this
        var filePath = path.resolve(__dirname, '../src/')
        _this.readDirRecur(filePath,function(){
            _this.spendTime('获取文件用时')
            _this.createAsset()
            _this.spendTime('获取文件依赖用时')
            _this.writeFileSync({
                'serveFiles.js':_this.serveFiles
            })
            _this.diffFile(_this.unique(_this.fileArray),_this.serveFiles)
        })
    },
    diffFile:function(a,b){
        var _this = this
        var sameFile = []
        for (var i = 0; i < b.length; i++) {
            for (var j = 0; j < a.length; j++) {
                if (a[j].indexOf(b[i])!=-1) {
                    sameFile.push(b[i])
                    b.splice(i, 1);
                }
            }
        }

        //  遍历获取sameFile文件里面所有的函数方法
        _this.getFunList(sameFile)

        // fs write file
        var noReq = _this.unique(b)
    
        _this.writeFileSync({
            'noReq.js':noReq,
            'sameFile.js':sameFile
        })
        _this.spendTime('总共用时')
    },
    /** 
     * 对数组去重 // 没有被
    */

    getFunList:function(noReq){
        var _this = this
        var  index = 0
        //console.log('noReqFile', ast)
        var fileFunList = {}
        for (let i = 0; i < noReq.length; i++) {
            index++
            var ast = _this.getAst(path.resolve(__dirname, '../src/'+noReq[i]+'.js'))
            var funName = []
            traverse(ast,{
                ExpressionStatement({node}) {
                    var properties = node.expression.right?node.expression.right.properties:''
                    if(properties&&properties.length){
                        for (let index = 0; index < properties.length; index++) {
                            var key = properties[index].key
                            if(key&&key.name){
                                funName.push(key.name) 
                            }   
                        }
                    }
                    
                }
            })
            fileFunList[noReq[i]+'.js'] = funName
        }

        if(JSON.stringify(fileFunList)!=='{}'){
            console.log('fileFunList.json',fileFunList)
            _this.writeFileSync({
                'fileFunList.json':fileFunList
            })
        }
        //console.log('fileFunList.js',typeof fileFunList)
        // console.log('~~~~~~~index~~~~~~',index)
    },
    /**
     *  fs write file
    */
    writeFileSync:function(obj){
        
        if(typeof obj !='object'){
            return
        }
        for(let key in obj){
            fs.writeFileSync(key, JSON.stringify(obj[key]),{ 
                encoding: 'utf8', 
                flag: 'w' 
            });
        }
        
    },
    spendTime:function(dateText){
        var timeB = new Date().getTime()
        console.log('~~~~~'+dateText+':'+(timeB-timeA)+'ms  ~~~~~')
    },
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
        return arrAarray
    },
    createAsset: function(){
        var _this = this 
        // 获取文件里面的依赖
        if(_this.fileList && _this.fileList.length){
            for (let index = 0; index < _this.fileList.length; index++) {
                _this.getfileArray(_this.fileList[index])
            }
        }
    },
    getfileArray:function(filename){
        var _this = this   
        //获取ast
        var ast = _this.getAst(filename)
        traverse(ast,{
            ImportDeclaration:({node})=>{
                _this.fileArray.push(node.source.value)
            },
            CallExpression({node}) {
                if(node.callee&&node.callee.name&&node.callee.name=='require'){
                    _this.fileArray.push(node.arguments[0].value)
                    _this.fileListObj.push({
                        filename :node.arguments[0].value
                    })
                }  
            }
        })
    },
    getAst:function(filename){
        var content = fs.readFileSync(filename,'utf-8')   
        //获取ast
        var ast = parse.parse(content,{
            sourceType:'module'
        })
        return ast
    },
    readDirRecur:function(folder,callback){
        var _this = this
        fs.readdir(folder, function (err, files) {
            var count = 0
            var checkEnd = function () {
                ++count == files.length && callback()
            }
            files.forEach(function (file) {
                var fullPath = folder + '/' + file;
                
                // 获取services下所有的文件
                if(folder.indexOf('/utils/services')!=-1){
                    _this.serveFiles.push('/utils/services/'+file.replace('.js',''))
                }
                fs.stat(fullPath, function (err, stats) {
                    // 如果是文件夹，深度遍历
                    if (stats.isDirectory()) {
                        return _this.readDirRecur(fullPath, checkEnd);
                    } else {
                        /*not use ignore files*/
                        // 过滤wxss,wxml文件 fullPath.endWidth(".js")
                        if (typeof fullPath === 'string' && fullPath.indexOf(".js") !=-1 && fullPath.indexOf(".json")==-1) {   
                            _this.fileList.push(fullPath)
                        }
                        checkEnd()
                    }
                })
            })
            //为空时直接回调
            files.length === 0 && callback()
        })
    }
}

checkReaptFun.init()