# vue-maker-plus

forked from @vue/cli-service-global

```bash
npm i -g vue-maker-plus
vmaker create my-project
vmaker serve
vmaker build
vmaker inspect
vmaker lint
```

命令行可以使用 `vue-maker-plus` 或者 `vmaker`
```bash
vue-maker-plus --version
vmaker --version
```
`serve` `build` `inspect` `lint` 命令的使用方式参数和vue-cli-service一样  
支持通过vue.config.js文件修改webpack配置  
```bash
vmaker serve
vmaker build
vmaker inspect
vmaker lint
```   
可参考`vue cli` [vue-cli-service官方文档](https://cli.vuejs.org/zh/guide/cli-service.html)   

-----
## `vmaker build`
`vmaker build` 额外增加两个参数 `--srchash` 和 `--no-srchah`   

1.使用`--srchash` 会计算每个源文件MD5值生成.srchash文件到打包目录   
再次打包时会对比上一次.srchash文件,如果相同则不进行打包   
2.使用`--no-srchah` 同样会计算每个源文件MD5值生成.srchash文件到打包目录,   
但不进行对比上一次.srchash文件,每次都进行打包

-----
## `vmaker create` 创建新项目
```bash
vmaker create some-project-name

Options:
  -d, --default     skip prompts
  -f, --force       Overwrite target directory if it exists
  --merge           Merge target directory if it exists
  -c, --clone       Use git clone when fetching remote preset
  --no-clone        Do not use git clone when fetching remote preset
  --disable-config  Disable user vue.maker.config
  -h, --help        output usage information
```

`vmaker create`    
```
? Enter the git repo of template source: (https://gitee.com/hm496/vue-project-templates.git)
```
1. 从templateSource指定的git仓库拉取template文件    
templateSource 默认值为 https://gitee.com/hm496/vue-project-templates.git   
2. 指定branch, 如指定branch为www   
则设置templateSource为 https://gitee.com/hm496/vue-project-templates.git#www   

templateSource中每个文件夹是一个模板     
模板使用`ejs`语法     
```
? Please select a template: (Use arrow keys)
> full
> mini
```

### 通过 `vue.maker.config.js` 设置模板逻辑   
`vue.maker.config.js`文件   
1. 可以放在每个模板的目录中(template vue.maker.config)    
2. 也可以放在当前执行`vmaker create`命令的目录 `process.cwd()` 及当前目录的父级目录中(user vue.maker.config)      

```js
// mini/vue.maker.config.js
module.exports = (creator) => {
  // creator 实例
  // creator.targetDir // 文件输出的文件夹
  // creator.doNotCopyFiles // 不需要拷贝的文件
  // creator.templateData // 模板数据
  return {
    cliOptions: {}, // 命令行参数
    doNotCopyFiles: [], // 不需要拷贝的文件
    templateSource: '', // 模板文件git地址
    templateData: {}, // 模板数据, 默认只有projectName
    prompts: [], // inquirer.prompt(prompts), 数据结果会合并到templateData
    hooks: {
      // 生成文件前执行
      beforeCreate () {
        // 可以在这里修改doNotCopyFiles 和 templateData
        // creator.doNotCopyFiles
        // creator.templateData
      },
      // 生成文件后执行
      finishCreate () {
        // 可以在这里执行git初始化等命令
        // creator.targetDir // 文件输出的文件夹
      },
    }
  }
};
```

