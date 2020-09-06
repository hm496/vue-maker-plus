const path = require('path');
const fs = require('fs');

const configFileName = 'vue.maker.config.js';
let userConfigCache = null;
let templateConfigCache = null;

function getTemplateConfig(templatePath) {
  if (!templateConfigCache) {
    const configPath = path.join(templatePath, configFileName);
    if (fs.existsSync(configPath)) {
      templateConfigCache = require(configPath);
    }
  }
  return templateConfigCache;
}

exports.getTemplateConfig = getTemplateConfig;

function getUserConfig() {
  if (!userConfigCache) {
    const pathArr = process.cwd().split(path.sep);
    for (let i = 0; i < pathArr.length; i++) {
      const configPath = pathArr.slice(0, pathArr.length - i).concat(configFileName).join(path.sep);
      if (fs.existsSync(configPath)) {
        userConfigCache = require(configPath);
        break;
      }
    }
  }
  return userConfigCache;
}

exports.getUserConfig = getUserConfig;
