const fs = require('fs');
const path = require('path');
const globby = require('globby');
const crypto = require('crypto');
const { warn, isPlugin, loadModule } = require('@vue/cli-shared-utils');
const readPkg = require('read-pkg');

exports.toPlugin = id => ({ id, apply: require(id) });

// Based on https://stackoverflow.com/questions/27367261/check-if-file-exists-case-sensitive
// Case checking is required, to avoid errors raised by case-sensitive-paths-webpack-plugin
function fileExistsWithCaseSync(filepath) {
  const { base, dir, root } = path.parse(filepath);

  if (dir === root || dir === '.') {
    return true;
  }

  try {
    const filenames = fs.readdirSync(dir);
    if (!filenames.includes(base)) {
      return false;
    }
  } catch (e) {
    // dir does not exist
    return false;
  }

  return fileExistsWithCaseSync(dir);
}

exports.findExisting = (context, files) => {
  for (const file of files) {
    if (fileExistsWithCaseSync(path.join(context, file))) {
      return file;
    }
  }
};

function computedFileHex(path) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(path);
    const hash = crypto.createHash('md5');

    stream.on('error', reject);

    stream.on('data', hash.update.bind(hash));

    stream.on('end', function () {
      const hex = hash.digest('hex');
      resolve(hex);
    });
  });
}

exports.generateSrcHash = (path, ignore) => {
  return globby('**/**', {
    noext: true,
    onlyFiles: true,
    absolute: true,
    cwd: path,
    ignore: [ '**/node_modules/**', '**/package-lock.json', '**/yarn.lock' ].concat(ignore)
  }).then(res => {
    let hexPromiseArr = [];
    res.forEach(filepath => {
      hexPromiseArr.push(computedFileHex(filepath));
    });
    return Promise.all(hexPromiseArr).then(res => {
      let str = res.sort().join(',');
      return str;
    }).catch(err => {
      console.log(chalk.red('Generate SrcHash Fail'));

      console.log();
      process.exit(1);
    });
  });
};

exports.getSrcHash = (outputDir, hashFile = '.srchash') => {
  try {
    return fs.readFileSync(
      path.join(outputDir, hashFile)
    ).toString('utf8');
  } catch (e) {
    return null;
  }
};

exports.setSrcHash = (outputDir, hash, hashFile = '.srchash') => {
  try {
    fs.writeFileSync(
      path.join(outputDir, hashFile),
      hash
    );
  } catch (e) {
    console.error(e);
  }
};


exports.getProjectPlugins = (context) => {
  let pkg, pkgContext;
  const resolvePkg = (inlinePkg, context) => {
    if (inlinePkg) {
      return inlinePkg
    } else if (fs.existsSync(path.join(context, 'package.json'))) {
      const pkg = readPkg.sync({ cwd: context })
      pkgContext = context;
      if (pkg.vuePlugins && pkg.vuePlugins.resolveFrom) {
        pkgContext = path.resolve(context, pkg.vuePlugins.resolveFrom)
        return resolvePkg(null, pkgContext)
      }
      return pkg
    } else {
      return {}
    }
  };

  const idToPlugin = id => ({
    id: id.replace(/^.\//, 'built-in:'),
    apply: loadModule(id, pkgContext)
  });
  pkg = resolvePkg(null, context);

  const projectPlugins = Object.keys(pkg.devDependencies || {})
    .concat(Object.keys(pkg.dependencies || {}))
    .filter(isPlugin)
    .filter(id => !/cli-plugin-(eslint|babel)/.test(id))
    .map(id => {
      if (
        pkg.optionalDependencies &&
        id in pkg.optionalDependencies
      ) {
        let apply = () => {
        };
        try {
          apply = loadModule(id, pkgContext)
        } catch (e) {
          warn(`Optional dependency ${id} is not installed.`)
        }
        return { id, apply }
      } else {
        console.log(pkgContext);
        console.log(id);
        return idToPlugin(id)
      }
    });

  return projectPlugins;
};

exports.setProjectOptionsPlugin = function (_context, _entry, _asLib, _args) {
  return {
    id: 'vue-maker-plus-set-project-options',
    apply: (api, options) => {
      if (_args.defaults === false) {
        return;
      }
      const isProdEnv = process.env.NODE_ENV === 'production';
      isProdEnv && (options.lintOnSave = false);
    }
  }
};
