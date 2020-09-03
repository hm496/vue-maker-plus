#!/usr/bin/env node

const chalk = require('chalk')
const program = require('commander')
const vueMakerPlus = require('../lib/vue-maker-plus');

program
  .command('create <app-name>')
  .description('create a new project powered by vue-cli-service')
  .action((name, cmd) => {
    require('../lib/create/index')(name)
  })

program
  .command('serve [entry]')
  .description('serve a .js or .vue file in development mode with zero config')
  .option('-o, --open', 'Open browser')
  .option('-c, --copy', 'Copy local url to clipboard')
  .option('-p, --port <port>', 'Port used by the server (default: 8080 or next available port)')
  .action((entry, cmd) => {
    vueMakerPlus(cleanArgs(cmd))
  });

program
  .command('build [entry]')
  .description('build a .js or .vue file in production mode with zero config')
  .option('-t, --target <target>', 'Build target (app | lib | wc | wc-async, default: app)')
  .option('-n, --name <name>', 'name for lib or web-component mode (default: entry filename)')
  .option('-d, --dest <dir>', 'output directory (default: dist)')
  .action((entry, cmd) => {
    vueMakerPlus(cleanArgs(cmd))
  });

program
  .arguments('<command>')
  .action((entry, cmd) => {
    vueMakerPlus(cleanArgs(cmd))
  });

program.parse(process.argv)

function camelize (str) {
  return str.replace(/-(\w)/g, (_, c) => c ? c.toUpperCase() : '')
}

// commander passes the Command object itself as options,
// extract only actual options into a fresh object.
function cleanArgs (cmd) {
  const args = {}
  cmd.options.forEach(o => {
    const key = camelize(o.long.replace(/^--/, ''))
    // if an option is not present and Command has a method with the same name
    // it should not be copied
    if (typeof cmd[key] !== 'function' && typeof cmd[key] !== 'undefined') {
      args[key] = cmd[key]
    }
  })
  return args
}
