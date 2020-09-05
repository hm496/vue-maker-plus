const path = require('path');
const fs = require('fs');

const configFileName = 'vue.maker.config.js';
let configCache = null;

function getConfig() {
  if (!configCache) {
    const pathArr = process.cwd().split(path.sep);
    for (let i = 0; i < pathArr.length; i++) {
      const configPath = pathArr.slice(0, pathArr.length - i).concat(configFileName).join(path.sep);
      if (fs.existsSync(configPath)) {
        configCache = require(configPath);
        break;
      }
    }
  }
  return configCache;
}

exports.getConfig = getConfig;
