#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const Service = require('@vue/cli-service');
const { toPlugin, findExisting } = require('../lib/util');

const babelPlugin = toPlugin('@vue/cli-plugin-babel');
const eslintPlugin = toPlugin('@vue/cli-plugin-eslint');
const globalConfigPlugin = require('../lib/globalConfigPlugin');

const context = process.cwd();

function resolveEntry (entry) {
  entry = entry || findExisting(context, [
    'src/index.js',
    'src/main.js',
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

  if (!fs.existsSync(path.join(context, entry))) {
    console.log(chalk.red(`Entry file ${chalk.yellow(entry)} does not exist.`));

    console.log();
    process.exit(1);
  }

  return {
    context,
    entry
  };
}

function createService (context, entry, asLib) {
  return new Service(context, {
    projectOptions: {
      compiler: true,
      lintOnSave: true
    },
    plugins: [
      babelPlugin,
      eslintPlugin,
      globalConfigPlugin(context, entry, asLib)
    ]
  });
}

(function () {
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
  // const command = "serve";

  const { context, entry } = resolveEntry();
  const asLib = args.target && args.target !== 'app';
  if (asLib) {
    args.entry = entry;
  }
  createService(context, entry, asLib).run(command, args, rawArgv);
})();
