// todo 赋值模板和创建文件夹复制
const path = require('path');
const inquirer = require('inquirer');
const download = require('download-git-repo');
const fs = require('fs-extra');
const ora = require('ora');
const chalk = require('chalk');

const TemplateRootPath = path.join(__dirname, '../../.vue-project-templates');

module.exports = class Creator {
  constructor(name, targetDir) {
  }

  async create(cliOptions = {}) {
    let { templateSource } = await inquirer.prompt([
      {
        name: 'templateSource',
        type: 'input',
        message: `Enter git address of template source(or use default):`
      }
    ]);
    templateSource = templateSource.trim();
    if (!templateSource) {
      templateSource = 'https://gitee.com/hm496/vue-project-templates.git';
    }
    await fetchTemplate(templateSource, TemplateRootPath, true);
    // todo 选择模板, 每个文件夹是一个模板
  }
};

function fetchTemplate(templateSource, templateRootPath, clone) {
  const tempPath = templateRootPath;
  let name;

  return new Promise(async (resolve) => {
    // 下载文件的缓存目录
    if (fs.existsSync(tempPath)) await fs.remove(tempPath);
    await fs.mkdir(tempPath);

    const spinner = ora(`正在从 ${templateSource} 拉取远程模板...`).start()
    name = Buffer.from(templateSource).toString('base64');
    download('direct:' + templateSource, path.join(tempPath, name), { clone }, async error => {
      if (error) {
        spinner.color = 'red';
        spinner.fail(chalk.red('拉取远程模板仓库失败！'));
        await fs.remove(tempPath);
        return resolve()
      }
      spinner.color = 'green';
      spinner.succeed(`${chalk.grey('拉取远程模板仓库成功！')}`);
      resolve()
    })
  })
}
