const fs = require('fs');
const path = require('path');
const globby = require('globby');
const crypto = require('crypto');

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

    stream.on('end', function() {
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
    ignore: ['**/node_modules/**', '**/package-lock.json', '**/yarn.lock'].concat(ignore)
  }).then(res => {
    let hexPromiseArr = [];
    res.forEach(filepath => {
      hexPromiseArr.push(computedFileHex(filepath));
    });
    return Promise.all(hexPromiseArr).then(res => {
      let str = res.sort().join('__');
      const hash = crypto.createHash('sha256');
      hash.update(str);
      return hash.digest('hex');
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
