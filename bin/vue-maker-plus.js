#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const Service = require('@vue/cli-service');
const { toPlugin, findExisting, generateSrcHash, getSrcHash, setSrcHash, getProjectPlugins } = require('../lib/util');

const babelPlugin = toPlugin('@vue/cli-plugin-babel');
const eslintPlugin = toPlugin('@vue/cli-plugin-eslint');
const globalConfigPlugin = require('../lib/globalConfigPlugin');

const context = process.cwd();

function resolveEntry(entry) {
  entry = entry || findExisting(context, [
    'src/main.js',
    'src/index.js',
    'src/App.vue',
    'src/app.vue',
    'main.js',
    'index.js',
    'App.vue',
    'app.vue'
  ]);

  if (!entry) {
    console.log(chalk.red(`Failed to locate entry file in ${chalk.yellow(context)}.`));
    console.log(chalk.red(`Valid entry file should be one of: main.js, index.js, App.vue or app.vue.`));

    console.log();
    process.exit(1);
  }

  if (!fs.pathExistsSync(path.join(context, entry))) {
    console.log(chalk.red(`Entry file ${chalk.yellow(entry)} does not exist.`));

    console.log();
    process.exit(1);
  }

  return {
    context,
    entry
  };
}

function createService(context, entry, asLib) {
  const projectPlugins = getProjectPlugins(context);

  return new Service(context, {
    projectOptions: {
      compiler: true,
      lintOnSave: true
    },
    plugins: [
      babelPlugin,
      eslintPlugin,
      globalConfigPlugin(context, entry, asLib)
    ].concat(projectPlugins)
  });
}

(async function() {
  const rawArgv = process.argv.slice(2);
  const args = require('minimist')(rawArgv, {
    boolean: [
      // build
      'modern',
      'report',
      'report-json',
      'watch',
      // serve
      'open',
      'copy',
      'https',
      // inspect
      'verbose'
    ]
  });
  const command = args._[0];
  const blackOptions = ['modern'];

  blackOptions.forEach(option => {
    if (args[option]) {
      args[option] = false;
      console.log(chalk.red(`Option --${option} is not available.`));
    }
  });

  const { context, entry } = resolveEntry();
  const asLib = args.target && args.target !== 'app';
  if (asLib) {
    args.entry = entry;
  }
  const service = createService(context, entry, asLib);

  // mode
  const mode = args.mode || (command === 'build' && args.watch ? 'development' : service.modes[command]);

  // srchash
  if (command === 'build' && args.srchash !== undefined) {
    service.init(mode);
    const webpackConfig = service.resolveWebpackConfig();
    if (webpackConfig.output && webpackConfig.output.path) {
      if (webpackConfig.output.path === context) {
        throw new Error(
          `\n\nConfiguration Error: ` +
          `Do not set output directory to project root.\n`
        );
      }
      args.clean = false;
      const newHash = await generateSrcHash(context, [webpackConfig.output.path + '/**']);
      let oldHash = '';
      if (fs.pathExistsSync(path.join(webpackConfig.output.path, service.projectOptions.indexPath))) {
        oldHash = getSrcHash(webpackConfig.output.path);
      }
      if (oldHash === newHash && args.srchash) {
        console.log(chalk.red(`Compiled files are already up-to-date`));

        console.log();
        process.exit(0);
        return;
      } else {
        fs.emptyDirSync(webpackConfig.output.path);
        setSrcHash(webpackConfig.output.path, newHash);
      }
    }
  }

  service.run(command, args, rawArgv);
})();
