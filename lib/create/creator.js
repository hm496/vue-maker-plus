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
const { exit, chalk } = require('@vue/cli-shared-utils');
const { getConfig } = require('./util/makerConfig');

const TemplateRootPath = path.join(__dirname, '../../.vue-project-templates');

const doNotCopyFiles = [];

module.exports = class Creator {
  constructor(projectName, targetDir) {
    this.projectName = projectName;
    this.targetDir = targetDir;
    this.cliOptions = {};
    this.templateData = {
      projectName: this.projectName
    };
    this.vueMakerConfig = null;
    this.defaultTemplateSource = 'https://gitee.com/hm496/vue-project-templates.git';
    this.defaultTemplateName = '';
  }

  async create(cliOptions = {}) {
    Object.assign(this.cliOptions, cliOptions);
    await this.applyVueMakerConfigPart1();
    await this.chooseTemplate();
    await this.applyVueMakerConfigPart2();
    await this.renderTemplate();
    console.log(chalk.green(`✔ Successfully created project ${this.projectName}.`));
    console.log();
  }

  async applyVueMakerConfigPart1() {
    try {
      if (this.cliOptions.disableConfig !== true) {
        const vueMakerConfigFn = getConfig();
        if (typeof vueMakerConfigFn === 'function') {
          this.vueMakerConfig = vueMakerConfigFn(this);
          if (this.vueMakerConfig) {
            const { cliOptions, templateSource, templateName } = this.vueMakerConfig;
            // templateSource
            templateSource && (this.defaultTemplateSource = templateSource);
            // templateName
            templateName && (this.defaultTemplateName = templateName);
            // cliOptions
            Object.assign(this.cliOptions, cliOptions);
          }
        }
      }
    } catch (e) {
      console.log(chalk.red('[VueMakerConfig] ' + String(e)));
    }
  }

  async applyVueMakerConfigPart2() {
    try {
      if (this.vueMakerConfig) {
        // templateData
        Object.assign(this.templateData, this.vueMakerConfig.templateData);
        if (this.cliOptions.default !== true) {
          // prompts
          const prompts = this.vueMakerConfig.prompts;
          if (Array.isArray(prompts) && prompts.length > 0) {
            const promptsData = await inquirer.prompt(prompts);
            Object.assign(this.templateData, promptsData);
          }
        }
        // doNotCopyFiles
        const _doNotCopyFiles = this.vueMakerConfig.doNotCopyFiles;
        if (Array.isArray(_doNotCopyFiles)) {
          doNotCopyFiles.push(..._doNotCopyFiles);
        }
      }
    } catch (e) {
      console.log(chalk.red('[VueMakerConfig] ' + String(e)));
    }
  }

  async renderTemplate() {
    const templatePath = this.templatePath;
    const _files = await globby(['**/*'], { cwd: templatePath });
    const files = this.files = [];
    for (const rawPath of _files) {
      if (doNotCopyFiles.includes(rawPath)) {
        continue;
      }
      const targetPath = rawPath.split('/').map(filename => {
        // dotfiles are ignored when published to npm, therefore in templates
        // we need to use underscore instead (e.g. "_gitignore")
        // _gitignore -> .gitignore
        // __gitignore -> _gitignore
        // pkg -> package.json
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
      }).join('/');
      const sourcePath = path.resolve(templatePath, rawPath);
      const content = renderFile(sourcePath, this.templateData);
      // only set file if it's not all whitespace, or is a Buffer (binary files)
      if (Buffer.isBuffer(content) || /[^\s]/.test(content)) {
        files[targetPath] = content
      }
    }
    await writeFileTree(this.targetDir, files);
  }

  async chooseTemplate() {
    let templateSource = this.defaultTemplateSource.trim();

    if (this.cliOptions.default !== true) {
      const templateSourceData = await inquirer.prompt([
        {
          name: 'templateSource',
          type: 'input',
          message: 'Enter the git repo of template source:',
          default: this.defaultTemplateSource
        }
      ]);
      templateSource = templateSourceData.templateSource.trim();
    }

    const templateSourcePath = path.join(TemplateRootPath, Buffer.from(templateSource).toString('base64'));
    const fetchStaus = await fetchTemplate(templateSource, templateSourcePath, this.cliOptions.clone);
    if (!fetchStaus) exit(1);
    const templatePaths = await globby(['*'], {
      onlyDirectories: true,
      cwd: templateSourcePath
    });
    if (templatePaths.length === 0) {
      throw Error('No template found in ' + templateSourcePath);
    }

    if (this.cliOptions.default !== true) {
      const templateName = this.templateData.templateName;
      if (templatePaths.includes(templateName)) {
        this.templatePath = path.join(templateSourcePath, templateName);
        return;
      }
    }
    const { templateName } = await inquirer.prompt([
      {
        name: 'templateName',
        type: 'list',
        message: 'Please select a template:',
        choices: templatePaths.map(dir => {
          return { name: dir, value: dir }
        })
      }
    ]);
    this.templatePath = path.join(templateSourcePath, templateName);
  }
};

function fetchTemplate(templateSource, templateSourcePath, clone) {
  return new Promise(async (resolve) => {
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

function renderFile(name, data, ejsOptions) {
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
