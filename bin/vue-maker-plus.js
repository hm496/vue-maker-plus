#!/usr/bin/env node

const program = require('commander');
const vueMakerPlus = require('../lib/vue-maker-plus');
const readPkg = require('read-pkg');
const path = require('path');

const pkg = readPkg.sync({ cwd: path.join(__dirname, '../') });
program.version(pkg.version);

program
  .command('create <app-name>')
  .description('create a new project')
  .option('-d, --default', 'skip prompts')
  .option('-f, --force', 'Overwrite target directory if it exists')
  .option('--merge', 'Merge target directory if it exists')
  .option('-c, --clone', 'Use git clone when fetching remote preset')
  .option('--no-clone', 'Do not use git clone when fetching remote preset')
  .option('--disable-config', 'Disable vue.maker.config')
  .action((name, cmd) => {
    const options = cleanArgs(cmd);

    if (process.argv.includes('-c') || process.argv.includes('--clone')) {
      options.clone = true
    }
    require('../lib/create/index')(name, options);
  });

program
  .command('serve [entry]')
  .description('serve a .js or .vue file in development mode with zero config')
  .option('-o, --open', 'Open browser')
  .option('-c, --copy', 'Copy local url to clipboard')
  .option('-p, --port <port>', 'Port used by the server (default: 8080 or next available port)')
  .action((entry, cmd) => {
    vueMakerPlus(entry, cleanArgs(cmd));
  });

program
  .command('build [entry]')
  .description('build a .js or .vue file in production mode with zero config')
  .option('-t, --target <target>', 'Build target (app | lib | wc | wc-async, default: app)')
  .option('-n, --name <name>', 'name for lib or web-component mode (default: entry filename)')
  .option('-d, --dest <dir>', 'output directory (default: dist)')
  .option('--srchash', 'Generate source files hash and Hash diff')
  .option('--no-srchash', 'Generate source files hash and Build forced')
  .action((entry, cmd) => {
    const options = cleanArgs(cmd);

    options.srchash = null;
    if (process.argv.includes('--srchash')) {
      options.srchash = true;
    } else if (process.argv.includes('--no-srchash')) {
      options.srchash = false;
    }
    vueMakerPlus(entry, options);
  });

program
  .command('inspect [paths...]')
  .description('inspect the webpack config in a project')
  .option('--mode <mode>')
  .option('--rule <ruleName>', 'inspect a specific module rule')
  .option('--plugin <pluginName>', 'inspect a specific plugin')
  .option('--rules', 'list all module rule names')
  .option('--plugins', 'list all plugin names')
  .option('-v --verbose', 'Show full function definitions in output')
  .action((paths, cmd) => {
    vueMakerPlus(void 0, cleanArgs(cmd));
  });

program
  .arguments('<command>')
  .action(() => {
    vueMakerPlus();
  });

program.parse(process.argv);

function camelize(str) {
  return str.replace(/-(\w)/g, (_, c) => c ? c.toUpperCase() : '')
}

// commander passes the Command object itself as options,
// extract only actual options into a fresh object.
function cleanArgs(cmd) {
  const args = {};
  cmd.options.forEach(o => {
    const key = camelize(o.long.replace(/^--/, ''))
    // if an option is not present and Command has a method with the same name
    // it should not be copied
    if (typeof cmd[key] !== 'function' && typeof cmd[key] !== 'undefined') {
      args[key] = cmd[key]
    }
  });
  return args
}
