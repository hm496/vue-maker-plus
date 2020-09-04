// todo 赋值模板和创建文件夹复制
const path = require('path');
const inquirer = require('inquirer');
const download = require('download-git-repo');
const fs = require('fs-extra');
const ora = require('ora');
const globby = require('globby');
const ejs = require('ejs');
const { isBinaryFileSync } = require('isbinaryfile');
const writeFileTree = require('./util/writeFileTree');
const { exit } = require('@vue/cli-shared-utils');

const TemplateRootPath = path.join(__dirname, '../../.vue-project-templates');

module.exports = class Creator {
  constructor (projectName, targetDir) {
    this.projectName = projectName;
    this.targetDir = targetDir;
    this.description = '';
    this.options = {};
  }

  async create (cliOptions = {}) {
    Object.assign(this.options, cliOptions);
    const templatePath = await this.chooseTemplate();
    await this.renderTemplate(templatePath);
    console.log(chalk.green(`✔ Successfully created project ${this.projectName}.`));
    console.log();
  }

  async renderTemplate (source) {
    let { description } = await inquirer.prompt([
      {
        type: 'input',
        name: 'description',
        message: 'Please enter the project description:'
      },
    ]);
    this.description = description.trim();

    const _files = await globby(['**/*'], { cwd: source });
    const data = {
      projectName: this.projectName,
      description: this.description,
    };
    const files = this.files = [];
    for (const rawPath of _files) {
      const targetPath = rawPath.split('/').map(filename => {
        // dotfiles are ignored when published to npm, therefore in templates
        // we need to use underscore instead (e.g. "_gitignore")
        if (filename.charAt(0) === '_' && filename.charAt(1) !== '_') {
          return `.${filename.slice(1)}`
        }
        if (filename.charAt(0) === '_' && filename.charAt(1) === '_') {
          return `${filename.slice(1)}`
        }
        if (filename === 'pkg') {
          return 'package.json';
        }
        return filename
      }).join('/')
      const sourcePath = path.resolve(source, rawPath)
      const content = renderFile(sourcePath, data)
      // only set file if it's not all whitespace, or is a Buffer (binary files)
      if (Buffer.isBuffer(content) || /[^\s]/.test(content)) {
        files[targetPath] = content
      }
    }
    await writeFileTree(this.targetDir, files);
  }

  async chooseTemplate () {
    let { templateSource } = await inquirer.prompt([
      {
        name: 'templateSource',
        type: 'input',
        message: 'Enter the git repo of template source:',
        default: 'https://gitee.com/hm496/vue-project-templates.git'
      }
    ]);
    templateSource = templateSource.trim();
    const templateSourcePath = path.join(TemplateRootPath, Buffer.from(templateSource).toString('base64'));
    const fetchStaus = await fetchTemplate(templateSource, templateSourcePath, true);
    if (!fetchStaus) exit(1);
    // todo 选择模板, 每个文件夹是一个模板
    const globby = require('globby')
    const templatePaths = await globby(['*'], {
      onlyDirectories: true,
      cwd: templateSourcePath
    });
    if (templatePaths.length === 0) {
      throw Error('No template found in ' + templateSourcePath);
    }
    const { templatePath } = await inquirer.prompt([
      {
        name: 'templatePath',
        type: 'list',
        message: 'Please select a template:',
        choices: templatePaths.map(dir => {
          return { name: dir, value: path.join(templateSourcePath, dir) }
        })
      }
    ]);
    return templatePath;
  }
};

function fetchTemplate (templateSource, templateSourcePath, clone) {
  return new Promise(async(resolve) => {
    if (fs.existsSync(templateSourcePath)) await fs.remove(templateSourcePath);

    const spinner = ora(`Pulling remote template from ${templateSource} ...`).start()
    download('direct:' + templateSource, templateSourcePath, { clone }, async error => {
      if (error) {
        spinner.color = 'red';
        spinner.fail(chalk.red('Failed pulled remote template repository！'));
        await fs.remove(templateSourcePath);
        return resolve(false);
      }
      spinner.color = 'green';
      spinner.succeed(`${chalk.green('Successfully pulled remote template repository！')}`);
      resolve(true);
    })
  })
}

function renderFile (name, data, ejsOptions) {
  if (isBinaryFileSync(name)) {
    return fs.readFileSync(name) // return buffer
  }
  const template = fs.readFileSync(name, 'utf-8')

  // custom template inheritance via yaml front matter.
  // ---
  // extend: 'source-file'
  // replace: !!js/regexp /some-regex/
  // OR
  // replace:
  //   - !!js/regexp /foo/
  //   - !!js/regexp /bar/
  // ---
  const yaml = require('yaml-front-matter')
  const parsed = yaml.loadFront(template)
  const content = parsed.__content
  let finalTemplate = content.trim() + `\n`

  if (parsed.when) {
    finalTemplate = (
      `<%_ if (${parsed.when}) { _%>` +
      finalTemplate +
      `<%_ } _%>`
    )

    // use ejs.render to test the conditional expression
    // if evaluated to falsy value, return early to avoid extra cost for extend expression
    const result = ejs.render(finalTemplate, data, ejsOptions)
    if (!result) {
      return ''
    }
  }

  if (parsed.extend) {
    const extendPath = path.isAbsolute(parsed.extend)
      ? parsed.extend
      : resolve.sync(parsed.extend, { basedir: path.dirname(name) })
    finalTemplate = fs.readFileSync(extendPath, 'utf-8')
    if (parsed.replace) {
      if (Array.isArray(parsed.replace)) {
        const replaceMatch = content.match(replaceBlockRE)
        if (replaceMatch) {
          const replaces = replaceMatch.map(m => {
            return m.replace(replaceBlockRE, '$1').trim()
          })
          parsed.replace.forEach((r, i) => {
            finalTemplate = finalTemplate.replace(r, replaces[i])
          })
        }
      } else {
        finalTemplate = finalTemplate.replace(parsed.replace, content.trim())
      }
    }
  }

  return ejs.render(finalTemplate, data, ejsOptions)
}
